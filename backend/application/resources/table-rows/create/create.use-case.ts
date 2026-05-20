/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IJWTPayload, IRow } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import { validateRowPayload } from '@application/core/row-payload-validator.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { ScriptExecutionContractService } from '@application/services/script-execution/script-execution-contract.service';

type Response = Either<HTTPException, IRow>;

type Payload = Record<string, unknown> & {
  slug: string;
  creator?: string | null;
  __actorUserJwt?: IJWTPayload;
};

@Service()
export default class TableRowCreateUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly scriptExecutionService: ScriptExecutionContractService,
    private readonly guardService: RowAccessGuardService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      // Extract __actorUserJwt early so it doesn't pollute validateRowPayload or DB writes
      const actorUserJwt =
        payload.__actorUserJwt && typeof payload.__actorUserJwt === 'object'
          ? (payload.__actorUserJwt as IJWTPayload)
          : undefined;
      delete payload.__actorUserJwt;

      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      const errors = validateRowPayload(payload, table.fields, table.groups);

      if (errors) {
        return left(
          HTTPException.BadRequest(
            'Requisição inválida',
            'INVALID_PAYLOAD_FORMAT',
            errors,
          ),
        );
      }

      await this.rowPasswordService.hash(payload, table.fields);

      const createData: Record<string, any> = {
        ...payload,
        creator: payload.creator ?? null,
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

        const scriptDoc: Record<string, any> = { ...createData };

        if (userFieldSlugs.length > 0) {
          const allUserIds: string[] = [];
          for (const slug of userFieldSlugs) {
            const val = createData[slug];
            if (Array.isArray(val)) {
              allUserIds.push(...val.filter((v: any) => typeof v === 'string'));
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
                  (id: any) => userMap.get(String(id)) ?? id,
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
            userId: payload.creator ?? undefined,
            isNew: true,
            tableInfo: {
              _id: table._id?.toString() ?? '',
              name: table.name,
              slug: table.slug,
            },
          },
        });

        if (result.logs.length > 0) {
          console.log(
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

      // Guard checks: canWrite -> sanitize (no canRead on create — no existing row)
      const guards = await this.guardService.getActiveGuardsFor(table._id);
      if (guards.length > 0) {
        for (const g of guards) {
          const check = g.canWrite(null, actorUserJwt, table, createData, 'create');
          if (!check.allowed) {
            return left(
              HTTPException.Forbidden(check.reason, 'ROW_WRITE_RESTRICTED'),
            );
          }
        }
        let sanitized: Record<string, unknown> = { ...createData };
        for (const g of guards) {
          sanitized = g.sanitizeWritePayload(sanitized, actorUserJwt, table, 'create', null);
        }
        for (const key of Object.keys(sanitized)) {
          createData[key] = sanitized[key];
        }
      }

      const row = await this.rowRepository.create({
        table,
        data: createData,
      });

      this.rowPasswordService.mask(row, table.fields);

      return right(row);
    } catch (error) {
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
