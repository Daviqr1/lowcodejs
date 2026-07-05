import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IRow, Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { RowContextBuilderContractService } from '@application/services/table/row-context-builder-contract.service';

import type { TableRowShowBySlugPayload } from './show-by-slug.validator';

type Response = Either<HTTPException, IRow>;

type Payload = Merge<TableRowShowBySlugPayload, { user?: string }>;

@Service()
export default class TableRowShowBySlugUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly rowContextBuilder: RowContextBuilderContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      if (!table.rowSlugFieldId) {
        return left(
          HTTPException.BadRequest(
            'Tabela não configurada para slugs',
            'TABLE_SLUG_FIELD_NOT_CONFIGURED',
          ),
        );
      }

      const row = await this.rowRepository.findOne({
        table,
        query: { sharedRowSlug: payload.rowSlug },
      });

      if (!row) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      this.rowPasswordService.mask(row, table.fields);

      return right(
        this.rowContextBuilder.transform(row, table.fields, payload.user),
      );
    } catch (error) {
      console.error('[table-rows > show-by-slug][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'GET_ROW_BY_SLUG_ERROR',
        ),
      );
    }
  }
}
