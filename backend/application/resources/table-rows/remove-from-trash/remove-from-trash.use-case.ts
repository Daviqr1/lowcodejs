import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IRow } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { TableRowRemoveFromTrashPayload } from './remove-from-trash.validator';

type Response = Either<HTTPException, IRow>;

type Payload = TableRowRemoveFromTrashPayload;

@Service()
export default class TableRowRemoveFromTrashUseCase {
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

      const row = await this.rowRepository.findOne({
        table,
        query: { _id: payload._id },
        populate: false,
      });

      if (!row) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      if (!row.trashedAt) {
        return left(
          HTTPException.Conflict('Registro não está na lixeira', 'NOT_TRASHED'),
        );
      }

      const updated = await this.rowRepository.update({
        table,
        _id: payload._id,
        data: { trashedAt: null },
      });

      if (!updated) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      return right(updated);
    } catch (error) {
      console.error('[table-rows > remove-from-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'REMOVE_ROW_FROM_TRASH_ERROR',
        ),
      );
    }
  }
}
