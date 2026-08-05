import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { E_FIELD_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { EvaluationContractRepository } from '@application/repositories/evaluation/evaluation-contract.repository';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowContextBuilderContractService } from '@application/services/table/row-context-builder-contract.service';

import type { TableRowEvaluationPayload } from '../_shared.validator';

type Response = Either<
  HTTPException,
  import('@application/core/entity.core').IRow
>;

type Payload = TableRowEvaluationPayload;

@Service()
export default class TableRowEvaluationUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly evaluationRepository: EvaluationContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowContextBuilder: RowContextBuilderContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

      const row = await this.rowRepository.findOne({
        table,
        query: { _id: payload._id },
        populate: false,
      });

      if (!row)
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );

      // `field` vem cru do body e era gravado direto na row: sem esta checagem
      // qualquer slug servia para sobrescrever qualquer campo do registro.
      const field = table.fields.find(
        (item) =>
          item.slug === payload.field &&
          item.type === E_FIELD_TYPE.EVALUATION &&
          !item.trashed,
      );

      if (!field)
        return left(
          HTTPException.BadRequest(
            'Campo de avaliação não encontrado nesta tabela',
            'EVALUATION_FIELD_NOT_FOUND',
          ),
        );

      const ctx = await this.rowAccessGuard.resolveContext(payload.user);
      const decision = await this.rowAccessGuard.composeWriteDecision(
        table._id.toString(),
        row,
        ctx,
        table,
        null,
        'update',
      );
      if (decision.decision === 'deny')
        return left(
          HTTPException.Forbidden(
            decision.reason ?? 'Acesso negado',
            'ROW_WRITE_RESTRICTED',
          ),
        );

      const fieldValue = row[payload.field];
      let existingIds: string[] = [];
      if (Array.isArray(fieldValue)) {
        existingIds = fieldValue.flatMap((r: { toString(): string }) =>
          r?.toString(),
        );
      }

      let oldEvaluationId: string | null = null;

      for (const id of existingIds) {
        const found = await this.evaluationRepository.findByIdAndUser(
          id,
          payload.user,
        );
        if (found) {
          oldEvaluationId = found._id;
          break;
        }
      }

      const evaluation = await this.evaluationRepository.create({
        value: payload.value,
        user: payload.user,
      });

      const evaluationId = evaluation._id.toString();

      let updatedRow: import('@application/core/entity.core').IRow;

      if (oldEvaluationId) {
        const updatedIds = existingIds.map((id) => {
          if (id === oldEvaluationId) {
            return evaluationId;
          }
          return id;
        });
        updatedRow = await this.rowRepository.setFieldAndSave({
          table,
          _id: payload._id,
          field: payload.field,
          value: updatedIds,
        });
        await this.evaluationRepository.delete(oldEvaluationId);
      } else {
        updatedRow = await this.rowRepository.setFieldAndSave({
          table,
          _id: payload._id,
          field: payload.field,
          value: [...existingIds, evaluationId],
        });
      }

      return right(
        this.rowContextBuilder.transform(
          updatedRow,
          table.fields,
          payload.user,
        ),
      );
    } catch (error) {
      console.error('[table-rows > evaluation][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'EVALUATION_ROW_TABLE_ERROR',
        ),
      );
    }
  }
}
