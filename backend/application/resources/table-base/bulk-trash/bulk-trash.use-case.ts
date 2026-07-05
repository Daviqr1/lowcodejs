import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { BulkTrashPayload } from './bulk-trash.validator';

type Response = Either<HTTPException, { modified: number }>;

@Service()
export default class BulkTrashUseCase {
  constructor(private readonly tableRepository: TableContractRepository) {}

  async execute(payload: BulkTrashPayload): Promise<Response> {
    try {
      const modified = await this.tableRepository.updateMany({
        _ids: payload.ids,
        filterTrashed: false,
        data: {
          trashed: true,
          trashedAt: new Date(),
        },
      });

      return right({ modified });
    } catch (error) {
      console.error('[table-base > bulk-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_TRASH_TABLES_ERROR',
        ),
      );
    }
  }
}
