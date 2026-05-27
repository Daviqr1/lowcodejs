/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IJWTPayload, IRow } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowContextContractService } from '@application/services/row-context/row-context-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';

import type { TableRowShowPayload } from './show.validator';

type Response = Either<HTTPException, IRow>;

type Payload = TableRowShowPayload & { user?: string; userJwt?: IJWTPayload };

@Service()
export default class TableRowShowUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly rowContextService: RowContextContractService,
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

      const row = await this.rowRepository.findOne({
        table,
        query: { _id: payload._id },
        includeReverseRelationships: true,
      });

      if (!row) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      const canRead = await this.guardService.composeReadDecision(
        table._id,
        row,
        payload.userJwt,
        table,
      );
      if (!canRead) {
        return left(
          HTTPException.Forbidden(
            'Sem permissão para acessar este registro',
            'ROW_ACCESS_DENIED',
          ),
        );
      }

      this.rowPasswordService.mask(row, table.fields);

      return right(
        this.rowContextService.transform(row, table.fields, payload.user),
      );
    } catch (error) {
      console.error('[table-rows > show][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'GET_ROW_TABLE_BY_ID_ERROR',
        ),
      );
    }
  }
}
