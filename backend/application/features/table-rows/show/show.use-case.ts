import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IRow, Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { FieldVisibilityContractService } from '@application/services/field-visibility/field-visibility-contract.service';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { RowContextBuilderContractService } from '@application/services/table/row-context-builder-contract.service';

import type { TableRowShowPayload } from '../_shared.validator';

type Response = Either<HTTPException, IRow>;

type Payload = Merge<
  TableRowShowPayload,
  {
    user?: string;
    isOwner?: boolean;
    isAdministrator?: boolean;
  }
>;

@Service()
export default class TableRowShowUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly rowContextBuilder: RowContextBuilderContractService,
    private readonly fieldVisibility: FieldVisibilityContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
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
      });

      if (!row) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      // Verifica permissão de leitura via guard.
      // Usa NotFound para não vazar a existência do registro.
      const ctx = await this.rowAccessGuard.resolveContext(payload.user);
      const tableId = table._id.toString();
      const canRead = await this.rowAccessGuard.composeReadDecision(
        tableId,
        row,
        ctx,
        table,
      );
      if (!canRead) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      this.rowPasswordService.mask(row, table.fields);

      const hidden = await this.fieldVisibility.hiddenSlugs({
        fields: table.fields,
        context: 'detail',
        userId: payload.user,
        isOwner: payload.isOwner,
        isAdministrator: payload.isAdministrator,
      });

      const transformed = this.rowContextBuilder.transform(
        row,
        table.fields,
        payload.user,
      );

      return right(this.fieldVisibility.project(transformed, hidden));
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
