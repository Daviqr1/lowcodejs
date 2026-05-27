/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IJWTPayload } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { BulkTrashPayload } from './bulk-trash.validator';

type SkippedRow = { rowId: string; reason: string };

type BulkTrashResult = {
  deleted: number;
  skipped: SkippedRow[];
};

type Response = Either<HTTPException, BulkTrashResult>;

type Payload = BulkTrashPayload & { userJwt?: IJWTPayload };

@Service()
export default class BulkTrashUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
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

      const survivors: string[] = [];
      const skipped: SkippedRow[] = [];

      for (const rowId of payload.ids) {
        const row = await this.rowRepository.findOne({
          table,
          query: { _id: rowId },
        });

        if (!row) {
          skipped.push({ rowId, reason: 'NOT_FOUND' });
          continue;
        }

        const canRead = await this.guardService.composeReadDecision(
          table._id,
          row,
          payload.userJwt,
          table,
        );
        if (!canRead) {
          skipped.push({ rowId, reason: 'ROW_ACCESS_DENIED' });
          continue;
        }

        const writeDecision = await this.guardService.composeWriteDecision(
          table._id,
          row,
          payload.userJwt,
          table,
          null,
          'delete',
        );
        if (writeDecision.decision === 'deny') {
          skipped.push({ rowId, reason: writeDecision.reason });
          continue;
        }

        survivors.push(rowId);
      }

      const deleted =
        survivors.length > 0
          ? await this.rowRepository.bulkTrash({
              table,
              ids: survivors,
            })
          : 0;

      return right({ deleted, skipped });
    } catch (error) {
      console.error('[table-rows > bulk-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_TRASH_ROWS_ERROR',
        ),
      );
    }
  }
}
