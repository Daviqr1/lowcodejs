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
import { KanbanCommentMentionContractService } from '@application/services/kanban-comment-mention/kanban-comment-mention-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { ScriptExecutionContractService } from '@application/services/script-execution/script-execution-contract.service';

type Response = Either<HTTPException, IRow>;

type Payload = Record<string, unknown> & {
  slug: string;
  _id: string;
  __actorUserId?: string;
  __actorUserJwt?: IJWTPayload;
};

@Service()
export default class TableRowUpdateUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly scriptExecutionService: ScriptExecutionContractService,
    private readonly kanbanCommentMentionService: KanbanCommentMentionContractService,
    private readonly guardService: RowAccessGuardService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      // Extract __actorUserJwt early so it doesn't pollute validateRowPayload or DB writes
      const actorUserJwt =
        payload.__actorUserJwt && typeof payload.__actorUserJwt === 'object'
          ? (payload.__actorUserJwt as IJWTPayload)
          : undefined;
      delete payload.__actorUserJwt;

      const errors = validateRowPayload(payload, table.fields, table.groups, {
        skipMissing: true,
      });

      if (errors) {
        return left(
          HTTPException.BadRequest(
            'Requisição inválida',
            'INVALID_PAYLOAD_FORMAT',
            errors,
          ),
        );
      }

      this.rowPasswordService.stripMasked(payload, table.fields);
      await this.rowPasswordService.hash(payload, table.fields);

      const beforeSaveCode = table.methods?.beforeSave?.code;
      const needsExistingRow = true; // always fetch to run guards + beforeSave

      let existing: IRow | null = null;
      if (needsExistingRow) {
        existing = await this.rowRepository.findOne({
          table,
          query: { _id: payload._id },
        });

        if (!existing) {
          return left(
            HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
          );
        }
      }

      if (beforeSaveCode && existing) {
        const fieldDefs = table.fields.map((f) => ({
          slug: f.slug,
          type: f.type,
          name: f.name,
          dropdown: f.dropdown,
        }));

        const userFieldSlugs = new Set(
          table.fields.filter((f) => f.type === 'USER').map((f) => f.slug),
        );

        const mergedData: Record<string, any> = {
          ...existing,
          ...payload,
        };

        const scriptDoc: Record<string, any> = { ...mergedData };
        for (const slug of userFieldSlugs) {
          if (slug in payload) {
            scriptDoc[slug] = existing[slug];
          }
        }

        const result = await this.scriptExecutionService.execute({
          code: beforeSaveCode,
          doc: scriptDoc,
          tableSlug: table.slug,
          fields: fieldDefs,
          context: {
            userAction: 'editar_registro',
            executionMoment: 'antes_salvar',
            userId:
              typeof payload.creator === 'string' ? payload.creator : undefined,
            isNew: false,
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

        for (const key of Object.keys(scriptDoc)) {
          if (!userFieldSlugs.has(key)) {
            payload[key] = scriptDoc[key];
          }
        }
      }

      const actorUserId =
        typeof payload.__actorUserId === 'string'
          ? payload.__actorUserId
          : undefined;
      delete payload.__actorUserId;

      // Guard checks: canRead -> canWrite -> sanitize
      if (existing) {
        const canRead = await this.guardService.composeReadDecision(
          table._id,
          existing,
          actorUserJwt,
          table,
        );
        if (!canRead) {
          return left(
            HTTPException.Forbidden(
              'Sem permissão para acessar este registro',
              'ROW_ACCESS_DENIED',
            ),
          );
        }
        const writeDecision = await this.guardService.composeWriteDecision(
          table._id,
          existing,
          actorUserJwt,
          table,
          payload as Record<string, unknown>,
          'update',
        );
        if (writeDecision.decision === 'deny') {
          return left(
            HTTPException.Forbidden(
              writeDecision.reason,
              'ROW_WRITE_RESTRICTED',
            ),
          );
        }
        // Sanitize after all gates pass
        const sanitized = await this.guardService.composeSanitize(
          table._id,
          payload as Record<string, unknown>,
          actorUserJwt,
          table,
          'update',
          existing,
        );
        for (const key of Object.keys(sanitized)) {
          (payload as Record<string, unknown>)[key] = sanitized[key];
        }
      }

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
      console.error('[table-rows > update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'UPDATE_ROW_TABLE_ERROR',
        ),
      );
    }
  }
}
