import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { EvaluationContractRepository } from '@application/repositories/evaluation/evaluation-contract.repository';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowContextBuilderContractService } from '@application/services/table/row-context-builder-contract.service';

import type { TableRowEvaluationPayload } from './evaluation.validator';

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
