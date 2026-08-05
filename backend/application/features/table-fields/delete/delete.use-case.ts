import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type {
  IGroupConfiguration,
  ITable,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';
import { CascadeDropdownConfigContractRepository } from '@extensions/forms/plugins/cascade-dropdown/cascade-dropdown-config-contract.repository';

import type { TableFieldDeletePayload } from '../_shared.validator';

type Response = Either<HTTPException, null>;
type Payload = TableFieldDeletePayload;

@Service()
export default class TableFieldDeleteUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly schemaBuilder: SchemaBuilderContractService,
    private readonly cascadeDropdownConfigRepository: CascadeDropdownConfigContractRepository,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

      // Se foi fornecido um group slug, exclui o campo do grupo
      const groupSlug = payload.group;
      if (groupSlug) {
        const targetGroup = table.groups?.find((g) => g.slug === groupSlug);
        if (!targetGroup) {
          return left(
            HTTPException.NotFound('Grupo não encontrado', 'GROUP_NOT_FOUND'),
          );
        }
        return this.deleteFieldInGroup(payload, table, targetGroup);
      }

      const field = await this.fieldRepository.findById(payload._id, {
        includeTrashed: true,
      });

      if (!field)
        return left(
          HTTPException.NotFound('Campo não encontrado', 'FIELD_NOT_FOUND'),
        );

      if (!field.trashed)
        return left(
          HTTPException.Conflict(
            'Campo deve estar na lixeira antes da exclusão permanente',
            'FIELD_NOT_TRASHED',
          ),
        );

      if (field.native) {
        return left(
          HTTPException.Forbidden(
            'Campos nativos não podem ser excluídos permanentemente',
            'NATIVE_FIELD_CANNOT_BE_DELETED',
          ),
        );
      }

      if (field.locked) {
        return left(
          HTTPException.Forbidden(
            'Campo está bloqueado e não pode ser excluído permanentemente',
            'FIELD_LOCKED',
          ),
        );
      }

      // Remove o campo da tabela e reconstrói o schema
      const remainingFields = table.fields.filter((f) => f._id !== field._id);
      const _schema = this.schemaBuilder.build(remainingFields);

      await this.tableRepository.update({
        _id: table._id,
        fields: remainingFields.flatMap((f) => f._id),
        _schema,
        owner: table.owner._id,
      });

      await this.cascadeDropdownConfigRepository.deleteForField({
        tableSlug: table.slug,
        fieldId: field._id,
        fieldSlug: field.slug,
      });

      await this.fieldRepository.delete(field._id);

      return right(null);
    } catch (error) {
      console.error('[table-fields > delete][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'DELETE_FIELD_ERROR',
        ),
      );
    }
  }

  private async deleteFieldInGroup(
    payload: Payload,
    parentTable: ITable,
    targetGroup: IGroupConfiguration,
  ): Promise<Response> {
    const field = await this.fieldRepository.findById(payload._id, {
      includeTrashed: true,
    });

    if (!field)
      return left(
        HTTPException.NotFound('Campo não encontrado', 'FIELD_NOT_FOUND'),
      );

    if (!field.trashed)
      return left(
        HTTPException.Conflict(
          'Campo deve estar na lixeira antes da exclusão permanente',
          'FIELD_NOT_TRASHED',
        ),
      );

    // Mesmas guardas do caminho top-level, que faltavam aqui.
    if (field.native)
      return left(
        HTTPException.Forbidden(
          'Campos nativos não podem ser excluídos permanentemente',
          'NATIVE_FIELD_CANNOT_BE_DELETED',
        ),
      );

    if (field.locked)
      return left(
        HTTPException.Forbidden(
          'Campo está bloqueado e não pode ser excluído permanentemente',
          'FIELD_LOCKED',
        ),
      );

    // Remove o campo do grupo e reconstrói o schema do grupo
    const updatedGroups = parentTable.groups.map((g) => {
      if (g.slug !== targetGroup.slug) return g;

      const updatedFields = g.fields.filter((f) => f._id !== field._id);
      const groupSchema = this.schemaBuilder.build(updatedFields);

      return {
        ...g,
        fields: updatedFields,
        _schema: groupSchema,
      };
    });

    // Reconstrói o schema da tabela pai com os grupos atualizados
    const parentSchema = this.schemaBuilder.build(
      parentTable.fields,
      updatedGroups,
    );

    await this.tableRepository.update({
      _id: parentTable._id,
      _schema: parentSchema,
      groups: updatedGroups,
      owner: parentTable.owner._id,
    });

    await this.cascadeDropdownConfigRepository.deleteForField({
      tableSlug: parentTable.slug,
      fieldId: field._id,
      fieldSlug: field.slug,
    });

    await this.fieldRepository.delete(field._id);

    return right(null);
  }
}
