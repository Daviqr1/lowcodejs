/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type {
  IJWTPayload,
  IMeta,
  IRow,
  Paginated,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowContextContractService } from '@application/services/row-context/row-context-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';

import type { TableRowPaginatedPayload } from './paginated.validator';

type Response = Either<HTTPException, Paginated<IRow>>;

type Payload = TableRowPaginatedPayload & {
  user?: string;
  userJwt?: IJWTPayload;
};

@Service()
export default class TableRowPaginatedUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly rowContextService: RowContextContractService,
    private readonly guardService: RowAccessGuardService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const skip = (payload.page - 1) * payload.perPage;

      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      const guardFilters = await this.guardService.composeListQuery(
        table._id,
        {},
        payload.userJwt,
        table,
      );

      const rows = await this.rowRepository.findMany({
        table,
        rawFilters: payload,
        extraFilters: guardFilters,
        skip,
        limit: payload.perPage,
        includeReverseRelationships: true,
      });

      const total = await this.rowRepository.count(
        table,
        payload,
        guardFilters,
      );

      const lastPage = Math.ceil(total / payload.perPage);

      const meta: IMeta = {
        total,
        perPage: payload.perPage,
        page: payload.page,
        lastPage,
        firstPage: total > 0 ? 1 : 0,
      };

      const data = rows.map((row) => {
        this.rowPasswordService.mask(row, table.fields);
        return this.rowContextService.transform(
          row,
          table.fields,
          payload.user,
        );
      });

      return right({
        meta,
        data,
      });
    } catch (error) {
      console.error('[table-rows > paginated][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_ROW_TABLE_PAGINATED_ERROR',
        ),
      );
    }
  }
}
