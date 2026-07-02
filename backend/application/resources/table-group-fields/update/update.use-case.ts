/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  type IField as Entity,
  type IField,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldSlug } from '@application/core/field-slug.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import {
  hasDuplicateDropdownLabels,
  normalizeDefaultValue,
} from '@application/resources/table-fields/table-field-base.schema';
import { ModelBuilderContractService } from '@application/services/table/model-builder-contract.service';
import { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';
import { deleteCascadeDropdownConfigsForField } from '@extensions/forms/plugins/cascade-dropdown/cascade-dropdown-config.model';

import type { GroupFieldUpdatePayload } from './update.validator';

type Response = Either<HTTPException, Entity>;
type Payload = GroupFieldUpdatePayload;

function isDefaultValueEqual(
  a: string | string[] | null | undefined,
  b: string | string[] | null | undefined,
): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === 'string' && typeof b === 'string') return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  return false;
}

@Service()
export default class GroupFieldUpdateUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly schemaBuilder: SchemaBuilderContractService,
    private readonly modelBuilder: ModelBuilderContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const tableSlug = payload.tableSlug ?? payload.slug;
      if (!tableSlug) {
        return left(
          HTTPException.BadRequest('Tabela inválida', 'INVALID_TABLE_SLUG'),
        );
      }

      // RELATIONSHIP é sempre top-level (§2): não pode virar campo de grupo.
      if (payload.type === E_FIELD_TYPE.RELATIONSHIP) {
        return left(
          HTTPException.BadRequest(
            'Este tipo de campo não é permitido dentro de um grupo',
            'FIELD_TYPE_NOT_ALLOWED_IN_GROUP',
            { type: 'Tipo de campo não permitido no grupo' },
          ),
        );
      }

      const table = await this.tableRepository.findBySlug(tableSlug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

      const targetGroup = table.groups?.find(
        (g) => g.slug === payload.groupSlug,
      );

      if (!targetGroup) {
        return left(
          HTTPException.NotFound('Grupo não encontrado', 'GROUP_NOT_FOUND'),
        );
      }

      const field = await this.fieldRepository.findById(payload.fieldId);

      if (!field)
        return left(
          HTTPException.NotFound('Campo não encontrado', 'FIELD_NOT_FOUND'),
        );

      if (field.native) {
        if (payload.trashed) {
          return left(
            HTTPException.Forbidden(
              'Campos nativos não podem ser enviados para a lixeira',
              'NATIVE_FIELD_CANNOT_BE_TRASHED',
            ),
          );
        }

        const updatedField = await this.fieldRepository.update({
          _id: field._id,
          showInFilter: payload.showInFilter,
          permissions: payload.permissions,
          widthInForm: payload.widthInForm,
          widthInList: payload.widthInList,
          widthInDetail: payload.widthInDetail,
          tip: payload.tip,
          // Rotulo customizado (so o texto, nunca o slug). Incluido apenas quando
          // enviado: callers que omitem nao apagam o label.
          ...(payload.label !== undefined && {
            label: payload.label,
          }),
        });

        const updatedGroups = table.groups.map((g) => {
          if (g.slug !== targetGroup.slug) return g;

          const updatedFields = g.fields.map((f) => {
            if (f._id === field._id) return updatedField;
            return f;
          });
          const groupSchema = this.schemaBuilder.build(updatedFields);

          return {
            ...g,
            fields: updatedFields,
            _schema: groupSchema,
          };
        });

        const parentSchema = this.schemaBuilder.build(
          table.fields,
          updatedGroups,
        );

        await this.tableRepository.update({
          _id: table._id,
          _schema: parentSchema,
          groups: updatedGroups,
          owner: table.owner._id,
        });

        return right(updatedField);
      }

      if (field.locked && !this.canUpdateLockedField(payload, field)) {
        return left(
          HTTPException.Forbidden(
            'Campo está bloqueado e não pode ser atualizado',
            'FIELD_LOCKED',
          ),
        );
      }

      const nameChanged = payload.name !== field.name;
      let resolvedSlug: { slug: string; error: string | null } = {
        slug: field.slug,
        error: null,
      };
      if (nameChanged) {
        resolvedSlug = FieldSlug.resolve({ name: payload.name });
      }

      if (resolvedSlug.error) {
        return left(
          HTTPException.BadRequest('Slug inválido', 'INVALID_FIELD_SLUG', {
            slug: resolvedSlug.error,
          }),
        );
      }

      const slug = resolvedSlug.slug;

      const existFieldInGroup = targetGroup.fields?.some(
        (item) => item._id !== field._id && item.slug === slug && !item.trashed,
      );

      if (existFieldInGroup) {
        return left(
          HTTPException.Conflict(
            'Campo já existe no grupo',
            'FIELD_ALREADY_EXIST',
            { slug: 'Campo já existe no grupo' },
          ),
        );
      }

      if (hasDuplicateDropdownLabels(payload.dropdown)) {
        return left(
          HTTPException.Conflict(
            'Opções do dropdown não podem ter nomes duplicados',
            'DROPDOWN_OPTION_ALREADY_EXISTS',
            { dropdown: 'Opção já existe no dropdown' },
          ),
        );
      }

      // Normalize group — same pattern as table-fields/update
      let normalizedGroup: { slug: string; _id?: string } | null = null;
      if (typeof payload.group === 'string') {
        normalizedGroup = { slug: payload.group };
      } else if (payload.group) {
        normalizedGroup = { slug: payload.group.slug };
        if (payload.group._id) {
          normalizedGroup._id = payload.group._id;
        }
      }

      const updatedField = await this.fieldRepository.update({
        ...payload,
        defaultValue: normalizeDefaultValue(payload.type, payload.defaultValue),
        _id: field._id,
        slug,
        group: normalizedGroup,
        ...(payload.trashed && {
          trashed: payload.trashed,
          required: false,
          permissions: buildFieldPermissions(false, false, false),
          showInFilter: false,
        }),
        ...(payload.trashedAt && { trashedAt: payload.trashedAt }),
      });

      // Atualiza o grupo com o campo atualizado
      const updatedGroups = table.groups.map((g) => {
        if (g.slug !== targetGroup.slug) return g;

        const updatedFields = g.fields.map((f) => {
          if (f._id === field._id) return updatedField;
          return f;
        });
        const groupSchema = this.schemaBuilder.build(updatedFields);

        return {
          ...g,
          fields: updatedFields,
          _schema: groupSchema,
        };
      });

      // Reconstrói o schema da tabela pai com os grupos atualizados
      const parentSchema = this.schemaBuilder.build(
        table.fields,
        updatedGroups,
      );

      await this.tableRepository.update({
        _id: table._id,
        _schema: parentSchema,
        groups: updatedGroups,
        owner: table.owner._id,
      });

      await this.modelBuilder.build({
        ...table,
        _id: table._id,
        _schema: parentSchema,
        groups: updatedGroups,
      });

      if (payload.trashed) {
        await deleteCascadeDropdownConfigsForField({
          tableSlug,
          fieldId: field._id,
          fieldSlug: field.slug,
        });
      }

      return right(updatedField);
    } catch (error) {
      console.error('[group-fields > update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'UPDATE_GROUP_FIELD_ERROR',
        ),
      );
    }
  }

  private canUpdateLockedField(payload: Payload, field: IField): boolean {
    // Locked fields allow visibility and width changes, block everything else
    // Group context is already defined by the URL, so group comparison is skipped
    if (payload.name !== field.name) return false;
    if (payload.type !== field.type) return false;
    if (payload.trashed || payload.trashedAt) return false;
    if (payload.required !== field.required) return false;
    if (payload.multiple !== field.multiple) return false;
    if (payload.format !== field.format) return false;
    if (!isDefaultValueEqual(payload.defaultValue, field.defaultValue))
      return false;

    // relationship: comparar por _id
    const payloadRelId = payload.relationship?.table?._id ?? null;
    const fieldRelId = field.relationship?.table?._id ?? null;
    if (payloadRelId !== fieldRelId) return false;

    return true;
  }
}
