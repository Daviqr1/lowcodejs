import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { BulkRestorePayload } from './bulk-restore.validator';

type Response = Either<HTTPException, { modified: number }>;

type Payload = Merge<
  BulkRestorePayload,
  {
    __actorUserId?: string;
    // Convidado contributor: só restaura os próprios registros.
    __ownOnly?: boolean;
  }
>;

@Service()
export default class BulkRestoreUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
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

      const modified = await this.rowRepository.bulkRestore({
        table,
        ids: payload.ids,
        ...(creatorId && { creatorId }),
      });

      return right({ modified });
    } catch (error) {
      console.error('[table-rows > bulk-restore][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_RESTORE_ROWS_ERROR',
        ),
      );
    }
  }
}
