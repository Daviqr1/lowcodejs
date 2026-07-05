/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';

import type { BulkTrashPayload } from './bulk-trash.validator';

type Response = Either<HTTPException, { modified: number }>;

type Payload = Merge<
  BulkTrashPayload,
  {
    __actorUserId?: string;
    // Convidado contributor: só envia para a lixeira os próprios registros.
    __ownOnly?: boolean;
  }
>;

@Service()
export default class BulkTrashUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
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

      let creatorId: string | undefined = undefined;
      if (payload.__ownOnly) creatorId = payload.__actorUserId;

      // Filtra os ids pelo guard — rows negadas são simplesmente ignoradas
      // (comportamento consistente com __ownOnly que já filtra silenciosamente).
      let actorUserId: string | undefined;
      if (typeof payload.__actorUserId === 'string') {
        actorUserId = payload.__actorUserId;
      }
      const ctx = await this.rowAccessGuard.resolveContext(actorUserId);
      const tableId = table._id.toString();

      let allowedIds = payload.ids;

      if (!ctx.isPrivileged) {
        const guardChecks = await Promise.all(
          payload.ids.map(async (id) => {
            const row = await this.rowRepository.findOne({
              table,
              query: { _id: id },
            });
            if (!row) return null;
            const dec = await this.rowAccessGuard.composeWriteDecision(
              tableId,
              row,
              ctx,
              table,
              null,
              'delete',
            );
            if (dec.decision !== 'deny') return id;
            return null;
          }),
        );
        allowedIds = guardChecks.filter((id): id is string => id !== null);
      }

      if (allowedIds.length === 0) {
        return right({ modified: 0 });
      }

      const modified = await this.rowRepository.bulkTrash({
        table,
        ids: allowedIds,
        ...(creatorId && { creatorId }),
      });

      return right({ modified });
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
