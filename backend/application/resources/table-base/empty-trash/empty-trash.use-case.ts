import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { E_TABLE_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

type Response = Either<HTTPException, { deleted: number }>;

@Service()
export default class EmptyTrashUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
  ) {}

  async execute(): Promise<Response> {
    try {
      const tables = await this.tableRepository.findMany({
        trashed: true,
        type: E_TABLE_TYPE.TABLE,
      });

      for (const table of tables) {
        const fieldIds = table.fields?.map((f) => f._id) ?? [];
        if (fieldIds.length > 0) {
          await this.fieldRepository.deleteMany(fieldIds);
        }

        await this.tableRepository.dropCollection(table.slug);
        await this.tableRepository.delete(table._id);
      }

      return right({ deleted: tables.length });
    } catch (error) {
      console.error('[table-base > empty-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'EMPTY_TRASH_TABLES_ERROR',
        ),
      );
    }
  }
}
