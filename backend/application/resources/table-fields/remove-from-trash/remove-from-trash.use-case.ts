/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField as Entity } from '@application/core/entity.core';
import { buildFieldPermissions } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';

import type { TableFieldRemoveFromTrashPayload } from './remove-from-trash.validator';

type Response = Either<HTTPException, Entity>;
type Payload = TableFieldRemoveFromTrashPayload;

@Service()
export default class TableFieldRemoveFromTrashUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly schemaBuilder: SchemaBuilderContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

      const field = await this.fieldRepository.findById(payload._id);

      if (!field)
        return left(
          HTTPException.NotFound('Campo não encontrado', 'FIELD_NOT_FOUND'),
        );

      if (!field.trashed)
        return left(
          HTTPException.Conflict('Campo não está na lixeira', 'NOT_TRASHED'),
        );

      const updatedField = await this.fieldRepository.update({
        _id: field._id,
        permissions: buildFieldPermissions(true, true, true),
        showInFilter: true,
        required: false,
        trashed: false,
        trashedAt: null,
      });

      const fields = table.fields.map((f) => {
        if (f._id === field._id) return updatedField;
        return f;
      });

      const _schema = this.schemaBuilder.build(fields);

      await this.tableRepository.update({
        _id: table._id,
        fields: fields.flatMap((f) => f._id),
        _schema,
        owner: table.owner._id,
      });

      return right(updatedField);
    } catch (error) {
      console.error('[table-fields > remove-from-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'REMOVE_FIELD_FROM_TRASH_ERROR',
        ),
      );
    }
  }
}
