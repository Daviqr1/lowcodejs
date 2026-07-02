/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
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

import type { GroupFieldCreatePayload } from './create.validator';

type Response = Either<HTTPException, Entity>;
type Payload = GroupFieldCreatePayload;

// Invariante nível único: tipos proibidos dentro de um grupo de campos.
// RELATIONSHIP é sempre top-level (associação entre tabelas independentes, §2);
// grupo é composição embedded e só aceita campos simples.
const TYPES_NOT_ALLOWED_IN_GROUP = new Set<string>([
  E_FIELD_TYPE.FIELD_GROUP,
  E_FIELD_TYPE.REACTION,
  E_FIELD_TYPE.EVALUATION,
  E_FIELD_TYPE.RELATIONSHIP,
]);

@Service()
export default class GroupFieldCreateUseCase {
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

      // Grupo de campos é nível único: não pode conter outro grupo, nem campos
      // de sistema (reação/avaliação). Defesa em profundidade — a UI já bloqueia.
      if (TYPES_NOT_ALLOWED_IN_GROUP.has(payload.type)) {
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

      // Verifica se o campo FIELD_GROUP pai está na lixeira
      const parentField = table.fields.find(
        (f) =>
          f.type === E_FIELD_TYPE.FIELD_GROUP &&
          f.group?.slug === payload.groupSlug,
      );
      if (parentField?.trashed) {
        return left(
          HTTPException.Forbidden(
            'Não é possível criar campos em um grupo na lixeira',
            'GROUP_IS_TRASHED',
          ),
        );
      }

      let slugInput: string | undefined;
      if (payload.tableSlug) slugInput = payload.slug;
      const resolvedSlug = FieldSlug.resolve({
        name: payload.name,
        slug: slugInput,
      });

      if (resolvedSlug.error) {
        return left(
          HTTPException.BadRequest('Slug inválido', 'INVALID_FIELD_SLUG', {
            slug: resolvedSlug.error,
          }),
        );
      }

      const slug = resolvedSlug.slug;

      // Verifica se o campo já existe no grupo
      const existFieldInGroup = targetGroup.fields?.find(
        (f) => f.slug === slug,
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

      // Cria o campo
      const field = await this.fieldRepository.create({
        ...payload,
        defaultValue: normalizeDefaultValue(payload.type, payload.defaultValue),
        slug,
        group: null,
      });

      // Atualiza o grupo com o novo campo e schema
      const updatedGroups = table.groups.map((g) => {
        if (g.slug !== targetGroup.slug) return g;

        const updatedFields = [...(g.fields || []), field];
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

      return right(field);
    } catch (error) {
      console.error('[group-fields > create][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'CREATE_GROUP_FIELD_ERROR',
        ),
      );
    }
  }
}
