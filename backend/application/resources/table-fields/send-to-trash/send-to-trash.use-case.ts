import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField as Entity } from '@application/core/entity.core';
import { buildFieldPermissions } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';
import { deleteCascadeDropdownConfigsForField } from '@extensions/forms/plugins/cascade-dropdown/cascade-dropdown-config.model';

import type { TableFieldSendToTrashPayload } from './send-to-trash.validator';

type Response = Either<HTTPException, Entity>;
type Payload = TableFieldSendToTrashPayload;

@Service()
export default class TableFieldSendToTrashUseCase {
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

      if (field.native) {
        return left(
          HTTPException.Forbidden(
            'Campos nativos não podem ser enviados para a lixeira',
            'NATIVE_FIELD_CANNOT_BE_TRASHED',
          ),
        );
      }

      if (field.locked) {
        return left(
          HTTPException.Forbidden(
            'Campo está bloqueado e não pode ser enviado para a lixeira',
            'FIELD_LOCKED',
          ),
        );
      }

      if (field.trashed)
        return left(
          HTTPException.Conflict('Campo já está na lixeira', 'ALREADY_TRASHED'),
        );

      const updatedField = await this.fieldRepository.update({
        _id: field._id,
        permissions: buildFieldPermissions(false, false, false),
        showInFilter: false,
        required: false,
        trashed: true,
        trashedAt: new Date(),
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

      await deleteCascadeDropdownConfigsForField({
        tableSlug: table.slug,
        fieldId: field._id,
        fieldSlug: field.slug,
      });

      return right(updatedField);
    } catch (error) {
      console.error('[table-fields > send-to-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'SEND_FIELD_TO_TRASH_ERROR',
        ),
      );
    }
  }
}
