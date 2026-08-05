import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { ITable as Entity } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { TableShowPayload } from '../_shared.validator';

type Response = Either<HTTPException, Entity>;
type Payload = TableShowPayload;

@Service()
export default class TableShowUseCase {
  constructor(private readonly tableRepository: TableContractRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

      return right(table);
    } catch (error) {
      console.error('[table-base > show][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'GET_TABLE_BY_SLUG_ERROR',
        ),
      );
    }
  }
}
