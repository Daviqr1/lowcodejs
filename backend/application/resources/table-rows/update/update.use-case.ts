import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type {
  IField,
  IRow,
  ITable,
  Merge,
} from '@application/core/entity.core';
import { E_FIELD_TYPE, E_ROW_STATUS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { resolveCreatorId } from '@application/core/row-ownership.core';
import { RowPayloadValidator } from '@application/core/row-payload-validator.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { FieldValidationContractService } from '@application/services/field-validation/field-validation-contract.service';
import { FieldVisibilityContractService } from '@application/services/field-visibility/field-visibility-contract.service';
import { KanbanCommentMentionContractService } from '@application/services/kanban-comment-mention/kanban-comment-mention-contract.service';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowMemberNotificationContractService } from '@application/services/row-member-notification/row-member-notification-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { ScriptExecutionContractService } from '@application/services/script-execution/script-execution-contract.service';
import { SlugContractService } from '@application/services/slug/slug-contract.service';

type Response = Either<HTTPException, IRow>;

type Payload = Merge<
  Record<string, unknown>,
  {
    slug: string;
    _id: string;
    __actorUserId?: string;
    // Convidado contributor: só pode editar os próprios registros.
    __ownOnly?: boolean;
    // Sinais do solicitante para a visibilidade de campo no formulario.
    __isOwner?: boolean;
    __isAdministrator?: boolean;
  }
>;

@Service()
export default class TableRowUpdateUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly scriptExecutionService: ScriptExecutionContractService,
    private readonly kanbanCommentMentionService: KanbanCommentMentionContractService,
    private readonly rowMemberNotificationService: RowMemberNotificationContractService,
    private readonly fieldVisibility: FieldVisibilityContractService,
    private readonly fieldValidation: FieldValidationContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
    private readonly slugService: SlugContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      const ownGuard = await this.enforceOwnRow(payload, table);
      if (ownGuard) return left(ownGuard);

      // Carrega currentRow para o guard (necessário para canWrite update e sanitize).
      const currentRow = await this.rowRepository.findOne({
        table,
        query: { _id: payload._id },
      });

      if (!currentRow) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      // Verifica permissão de escrita (update) via guard.
      let actorUserId: string | undefined;
      if (typeof payload.__actorUserId === 'string') {
        actorUserId = payload.__actorUserId;
      }
      const ctx = await this.rowAccessGuard.resolveContext(actorUserId);
      const tableId = table._id.toString();

      const writeDecision = await this.rowAccessGuard.composeWriteDecision(
        tableId,
        currentRow,
        ctx,
        table,
        payload,
        'update',
      );
      if (writeDecision.decision === 'deny') {
        return left(
          HTTPException.Forbidden(
            writeDecision.reason ?? 'Acesso negado',
            'ROW_WRITE_RESTRICTED',
          ),
        );
      }

      // Sanitiza payload (ex: preservar valor de visibility quando não permitido).
      const payloadRecord: Record<string, unknown> = payload;
      const sanitized = await this.rowAccessGuard.composeSanitize(
        tableId,
        payloadRecord,
        ctx,
        table,
        'update',
        currentRow,
      );
      for (const key of Object.keys(sanitized)) {
        payloadRecord[key] = sanitized[key];
      }

      // Descarta escritas em campos ocultos no formulario para o solicitante.
      const hidden = await this.fieldVisibility.hiddenSlugs({
        fields: table.fields,
        context: 'form',
        userId: actorUserId,
        isOwner: payload.__isOwner,
        isAdministrator: payload.__isAdministrator,
      });
      this.fieldVisibility.project(payload, hidden);
      delete payload.__isOwner;
      delete payload.__isAdministrator;

      // Campos USER com a flag: grava o usuario logado quando nenhum id vem no
      // payload. Roda antes da validacao (mesma regra do create).
      this.applyUserSelfFill(payload, table.fields, actorUserId);

      const errors = RowPayloadValidator.validate(
        payload,
        table.fields,
        table.groups,
        {
          skipMissing: true,
        },
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

      // Passe das regras configuradas. skipMissing (update parcial) + currentRowId
      // para a unicidade ignorar a propria row.
      const validationErrors = await this.fieldValidation.validate(
        payload,
        table,
        { skipMissing: true, currentRowId: payload._id },
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
          const existing = await this.rowRepository.listSlugs(
            table,
            payload._id,
          );
          payload.sharedRowSlug = this.slugService.unique(
            String(payload[slugField.slug]),
            existing,
          );
        }
      }

      this.rowPasswordService.stripMasked(payload, table.fields);
      await this.rowPasswordService.hash(payload, table.fields);

      const beforeSaveCode = table.methods?.beforeSave?.code;
      if (beforeSaveCode) {
        // Nota: currentRow já foi carregado acima — reusa para o script.
        const existing = currentRow;

        const fieldDefs = table.fields.map((f) => ({
          slug: f.slug,
          type: f.type,
          name: f.name,
          dropdown: f.dropdown,
        }));

        const userFieldList = table.fields
          .filter((f) => f.type === 'USER')
          .map((f) => f.slug);
        const userFieldSlugs = new Set(userFieldList);

        const mergedData: Record<string, unknown> = {
          ...existing,
          ...payload,
        };

        // Resolve os campos USER para os valores NOVOS (objetos com email),
        // espelhando o create. Assim o script enxerga os responsáveis atuais
        // (e não os anteriores). Os campos USER não são gravados de volta no
        // payload (loop abaixo), então isso afeta apenas a visão do script.
        const scriptDoc: Record<string, unknown> = { ...mergedData };
        if (userFieldList.length > 0) {
          const extractId = (value: unknown): string => {
            if (!value) return '';
            if (typeof value === 'string') return value;
            if (typeof value === 'object' && '_id' in value) {
              return String(value._id ?? '');
            }
            return String(value);
          };

          const allUserIds: string[] = [];
          for (const slug of userFieldList) {
            const val = mergedData[slug];
            let items: unknown[] = [val];
            if (Array.isArray(val)) items = val;
            for (const item of items) {
              const id = extractId(item);
              if (id) allUserIds.push(id);
            }
          }

          if (allUserIds.length > 0) {
            const usersList = await this.userRepository.findMany({
              _ids: allUserIds,
            });
            const userMap = new Map(
              usersList.map((u) => [u._id.toString(), u]),
            );

            for (const slug of userFieldList) {
              const val = mergedData[slug];
              if (Array.isArray(val)) {
                scriptDoc[slug] = val.map(
                  (item) => userMap.get(extractId(item)) ?? item,
                );
              } else {
                const id = extractId(val);
                if (id && userMap.has(id)) scriptDoc[slug] = userMap.get(id);
              }
            }
          }
        }

        let scriptCreatorId: string | undefined;
        if (typeof payload.creator === 'string') {
          scriptCreatorId = payload.creator;
        }
        const result = await this.scriptExecutionService.execute({
          code: beforeSaveCode,
          doc: scriptDoc,
          tableSlug: table.slug,
          fields: fieldDefs,
          context: {
            userAction: 'editar_registro',
            executionMoment: 'antes_salvar',
            userId: scriptCreatorId,
            isNew: false,
            viaSaveHook: false,
            previous: existing,
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

        for (const key of Object.keys(scriptDoc)) {
          if (!userFieldSlugs.has(key)) {
            payload[key] = scriptDoc[key];
          }
        }
      }

      delete payload.__actorUserId;

      // Auditoria nativa: registra quem fez a ultima alteracao (UPDATER).
      // updatedAt e gerenciado automaticamente pelo Mongoose (timestamps).
      // Espelha o comportamento de `creator` (CREATOR) no create.
      payload.updater = actorUserId ?? null;

      // O ato de salvar via update publica o registro (rascunho -> publicado).
      // Nao mexe em trashedAt: lixeira e controlada pelos endpoints de trash.
      payload.status = E_ROW_STATUS.PUBLISHED;
      payload.draftAt = null;

      const previousRow = currentRow;

      const row = await this.rowRepository.update({
        table,
        _id: payload._id,
        data: payload,
      });

      if (!row) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      await this.rowMemberNotificationService.notifyNewMembers({
        table,
        previousRow,
        nextRow: row,
        actorUserId: actorUserId ?? '',
      });

      const mentionResult =
        await this.kanbanCommentMentionService.notifyNewMentions({
          table,
          row,
          actorUserId: actorUserId ?? '',
        });

      let finalRow = row;
      if (mentionResult.changed && mentionResult.data) {
        const updatedRow = await this.rowRepository.update({
          table,
          _id: payload._id,
          data: mentionResult.data,
        });
        if (updatedRow) finalRow = updatedRow;
      }

      this.rowPasswordService.mask(finalRow, table.fields);

      return right(finalRow);
    } catch (error) {
      // Violacoes de cardinalidade/vinculo (RELATIONSHIP) chegam como
      // HTTPException pelo row.repository — preserva code/cause originais.
      if (error instanceof HTTPException) return left(error);
      console.error('[table-rows > update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'UPDATE_ROW_TABLE_ERROR',
        ),
      );
    }
  }

  // Campos USER com `fillWithCurrentUserWhenEmpty`: grava o usuario logado
  // quando nenhum id vem no payload (ausente, null, '' ou []). Muta o payload.
  private applyUserSelfFill(
    payload: Record<string, unknown>,
    fields: IField[],
    userId: string | undefined,
  ): void {
    if (!userId) return;

    for (const field of fields) {
      if (field.type !== E_FIELD_TYPE.USER) continue;
      if (!field.fillWithCurrentUserWhenEmpty) continue;

      const value = payload[field.slug];
      const isEmpty =
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0);
      if (!isEmpty) continue;

      payload[field.slug] = [userId];
    }
  }

  /**
   * Quando o acesso veio de um convidado contributor (__ownOnly), o registro só
   * pode ser editado pelo seu próprio criador. Retorna a exceção a propagar ou
   * null quando liberado.
   */
  private async enforceOwnRow(
    payload: Payload,
    table: ITable,
  ): Promise<HTTPException | null> {
    if (!payload.__ownOnly) return null;

    const current = await this.rowRepository.findOne({
      table,
      query: { _id: payload._id },
    });

    if (!current) {
      return HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND');
    }

    const creatorId = resolveCreatorId(current.creator);
    if (!payload.__actorUserId || creatorId !== payload.__actorUserId) {
      return HTTPException.Forbidden(
        'Você só pode editar os seus próprios registros',
        'OWN_ROW_ONLY',
      );
    }

    return null;
  }
}
