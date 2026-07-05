/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IRow, Merge } from '@application/core/entity.core';
import { E_ROW_STATUS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldSlug } from '@application/core/field-slug.core';
import { RowPayloadValidator } from '@application/core/row-payload-validator.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { FieldValidationContractService } from '@application/services/field-validation/field-validation-contract.service';
import { FieldVisibilityContractService } from '@application/services/field-visibility/field-visibility-contract.service';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowMemberNotificationContractService } from '@application/services/row-member-notification/row-member-notification-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { ScriptExecutionContractService } from '@application/services/script-execution/script-execution-contract.service';

type Response = Either<HTTPException, IRow>;

type Payload = Merge<
  Record<string, unknown>,
  {
    slug: string;
    creator?: string | null;
    // Sinais do solicitante (TableAccessMiddleware) para a visibilidade de campo
    // no formulario. Mongoose strict descarta as chaves __ ao persistir.
    __isOwner?: boolean;
    __isAdministrator?: boolean;
  }
>;

@Service()
export default class TableRowCreateUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly scriptExecutionService: ScriptExecutionContractService,
    private readonly rowMemberNotificationService: RowMemberNotificationContractService,
    private readonly fieldVisibility: FieldVisibilityContractService,
    private readonly fieldValidation: FieldValidationContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      // Verifica permissão de escrita (create) via guard.
      let creatorId: string | undefined;
      if (typeof payload.creator === 'string') creatorId = payload.creator;
      const ctx = await this.rowAccessGuard.resolveContext(creatorId);
      const tableId = table._id.toString();

      const writeDecision = await this.rowAccessGuard.composeWriteDecision(
        tableId,
        null,
        ctx,
        table,
        payload,
        'create',
      );
      if (writeDecision.decision === 'deny') {
        return left(
          HTTPException.Forbidden(
            writeDecision.reason ?? 'Acesso negado',
            'ROW_WRITE_RESTRICTED',
          ),
        );
      }

      // Sanitiza payload antes de validar/salvar (ex: forçar valor de visibility).
      const payloadRecord: Record<string, unknown> = payload;
      const sanitized = await this.rowAccessGuard.composeSanitize(
        tableId,
        payloadRecord,
        ctx,
        table,
        'create',
        null,
      );
      // Copia de volta as chaves sanitizadas para o payload mutável.
      for (const key of Object.keys(sanitized)) {
        payloadRecord[key] = sanitized[key];
      }

      // Descarta escritas em campos ocultos no formulario para o solicitante.
      const hidden = await this.fieldVisibility.hiddenSlugs({
        fields: table.fields,
        context: 'form',
        userId: creatorId,
        isOwner: payload.__isOwner,
        isAdministrator: payload.__isAdministrator,
      });
      this.fieldVisibility.project(payload, hidden);
      delete payload.__isOwner;
      delete payload.__isAdministrator;

      const errors = RowPayloadValidator.validate(
        payload,
        table.fields,
        table.groups,
      );

      if (errors) {
        return left(
          HTTPException.BadRequest(
            'Requisição inválida',
            'INVALID_PAYLOAD_FORMAT',
            errors,
          ),
        );
      }

      // Passe de validacao das regras configuradas (camada unica). Async porque
      // regras como IS_UNIQUE/EMAIL_EXISTS consultam o banco.
      const validationErrors = await this.fieldValidation.validate(
        payload,
        table,
      );

      if (validationErrors) {
        return left(
          HTTPException.BadRequest(
            'Requisição inválida',
            'INVALID_PAYLOAD_FORMAT',
            validationErrors,
          ),
        );
      }

      if (table.rowSlugFieldId) {
        const slugField = table.fields.find(
          (f) => f._id === table.rowSlugFieldId,
        );
        if (slugField && payload[slugField.slug]) {
          const existing = await this.rowRepository.listSlugs(table);
          payload.sharedRowSlug = FieldSlug.suggestUnique(
            String(payload[slugField.slug]),
            existing,
          );
        }
      }

      await this.rowPasswordService.hash(payload, table.fields);

      const createData: Record<string, unknown> = {
        ...payload,
        creator: payload.creator ?? null,
        // Espelha creator em updater para que "Modificado por" apareça
        // imediatamente após criação, sem precisar de um PUT subsequente.
        updater: payload.creator ?? null,
        // Salvar via create publica o registro (fonte de verdade = status).
        status: E_ROW_STATUS.PUBLISHED,
        draftAt: null,
        trashedAt: null,
      };

      const beforeSaveCode = table.methods?.beforeSave?.code;

      if (beforeSaveCode) {
        const fieldDefs = table.fields.map((f) => ({
          slug: f.slug,
          type: f.type,
          name: f.name,
          dropdown: f.dropdown,
        }));

        const userFieldSlugs = table.fields
          .filter((f) => f.type === 'USER')
          .map((f) => f.slug);

        const scriptDoc: Record<string, unknown> = { ...createData };

        if (userFieldSlugs.length > 0) {
          const allUserIds: string[] = [];
          for (const slug of userFieldSlugs) {
            const val = createData[slug];
            if (Array.isArray(val)) {
              allUserIds.push(...val.filter((v) => typeof v === 'string'));
            } else if (typeof val === 'string' && val) {
              allUserIds.push(val);
            }
          }

          if (allUserIds.length > 0) {
            const users = await this.userRepository.findMany({
              _ids: allUserIds,
            });

            const userMap = new Map(users.map((u) => [u._id.toString(), u]));

            for (const slug of userFieldSlugs) {
              const val = createData[slug];
              if (Array.isArray(val)) {
                scriptDoc[slug] = val.map(
                  (id) => userMap.get(String(id)) ?? id,
                );
              } else if (typeof val === 'string' && userMap.has(val)) {
                scriptDoc[slug] = userMap.get(val);
              }
            }
          }
        }

        const result = await this.scriptExecutionService.execute({
          code: beforeSaveCode,
          doc: scriptDoc,
          tableSlug: table.slug,
          fields: fieldDefs,
          context: {
            userAction: 'novo_registro',
            executionMoment: 'antes_salvar',
            userId: creatorId,
            isNew: true,
            viaSaveHook: false,
            previous: null,
            tableInfo: {
              _id: table._id?.toString() ?? '',
              name: table.name,
              slug: table.slug,
            },
          },
        });

        if (result.logs.length > 0) {
          console.info(
            `[beforeSave][${table.slug}] logs:`,
            result.logs.join('\n'),
          );
        }

        if (!result.success) {
          console.error(
            `[beforeSave][${table.slug}] error:`,
            result.error?.message,
          );
        }

        const userSlugSet = new Set(userFieldSlugs);
        for (const key of Object.keys(scriptDoc)) {
          if (!userSlugSet.has(key)) {
            createData[key] = scriptDoc[key];
          }
        }
      }

      const row = await this.rowRepository.create({
        table,
        data: createData,
      });

      await this.rowMemberNotificationService.notifyNewMembers({
        table,
        previousRow: null,
        nextRow: row,
        actorUserId: creatorId ?? '',
      });

      this.rowPasswordService.mask(row, table.fields);

      return right(row);
    } catch (error) {
      // Violacoes de cardinalidade/vinculo (RELATIONSHIP) chegam como
      // HTTPException pelo row.repository — preserva code/cause originais.
      if (error instanceof HTTPException) return left(error);
      console.error('[table-rows > create][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'CREATE_ROW_ERROR',
        ),
      );
    }
  }
}
