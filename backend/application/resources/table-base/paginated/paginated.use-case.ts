import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type {
  ITable as Entity,
  IMeta,
  Paginated,
} from '@application/core/entity.core';
import { E_TABLE_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { TablePaginatedPayload } from './paginated.validator';

type Response = Either<HTTPException, Paginated<Entity>>;
type Payload = TablePaginatedPayload;

@Service()
export default class TablePaginatedUseCase {
  constructor(private readonly tableRepository: TableContractRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const trashed = payload.trashed === 'true';

      const sort: Record<string, 'asc' | 'desc'> = {};
      if (payload['order-name']) sort.name = payload['order-name'];
      if (payload['order-link']) sort.slug = payload['order-link'];
      if (payload['order-created-at'])
        sort.createdAt = payload['order-created-at'];
      if (payload['order-owner']) sort['owner.name'] = payload['order-owner'];

      const tables = await this.tableRepository.findMany({
        page: payload.page,
        perPage: payload.perPage,
        search: payload.search ?? payload.name,
        type: E_TABLE_TYPE.TABLE,
        trashed,
        owner: payload.owner,
        sort,
      });

      const total = await this.tableRepository.count({
        search: payload.search ?? payload.name,
        type: E_TABLE_TYPE.TABLE,
        trashed,
        owner: payload.owner,
      });

      const lastPage = Math.ceil(total / payload.perPage);

      const meta: IMeta = {
        total,
        perPage: payload.perPage,
        page: payload.page,
        lastPage,
        firstPage: Number(total > 0),
      };

      return right({
        meta,
        data: tables,
      });
    } catch (error) {
      console.error('[table-base > paginated][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'TABLE_LIST_PAGINATED_ERROR',
        ),
      );
    }
  }
}
