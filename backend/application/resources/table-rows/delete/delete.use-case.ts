/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IJWTPayload } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { TableRowDeletePayload } from './delete.validator';

type Response = Either<HTTPException, null>;
type Payload = TableRowDeletePayload & { userJwt?: IJWTPayload };

@Service()
export default class TableRowDeleteUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
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

      const existing = await this.rowRepository.findOne({
        table,
        query: { _id: payload._id },
      });

      if (!existing) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      const canRead = await this.guardService.composeReadDecision(
        table._id,
        existing,
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
      const writeDecision = await this.guardService.composeWriteDecision(
        table._id,
        existing,
        payload.userJwt,
        table,
        null,
        'delete',
      );
      if (writeDecision.decision === 'deny') {
        return left(
          HTTPException.Forbidden(writeDecision.reason, 'ROW_WRITE_RESTRICTED'),
        );
      }

      const deleted = await this.rowRepository.deleteOne(table, payload._id);

      if (!deleted) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      return right(null);
    } catch (error) {
      console.error('[table-rows > delete][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'DELETE_ROW_ERROR',
        ),
      );
    }
  }
}
