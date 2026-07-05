import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  E_FIELD_TYPE,
  E_RELATIONSHIP_ON_DELETE,
  E_TABLE_TYPE,
  FIELD_GROUP_NATIVE_LIST,
  type IField as Entity,
  type IGroupConfiguration,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldSlug } from '@application/core/field-slug.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RelationshipMaterializationContractService } from '@application/services/relationship/relationship-materialization-contract.service';
import { ModelBuilderContractService } from '@application/services/table/model-builder-contract.service';
import { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';

import {
  hasDuplicateDropdownLabels,
  normalizeDefaultValue,
} from '../table-field-base.schema';

import type { TableFieldCreatePayload } from './create.validator';

type Response = Either<HTTPException, Entity>;
type Payload = TableFieldCreatePayload;

@Service()
export default class TableFieldCreateUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly schemaBuilder: SchemaBuilderContractService,
    private readonly modelBuilder: ModelBuilderContractService,
    private readonly relationshipMaterialization: RelationshipMaterializationContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const tableSlug = payload.tableSlug ?? payload.slug;
      if (!tableSlug) {
        return left(
          HTTPException.BadRequest('Tabela inválida', 'INVALID_TABLE_SLUG'),
        );
      }

      const table = await this.tableRepository.findBySlug(tableSlug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

      // Sem relacionamento-de-relacionamento (§7): um campo RELATIONSHIP não
      // pode apontar para uma tabela que é só estrutura de relacionamento/grupo.
      if (
        payload.type === E_FIELD_TYPE.RELATIONSHIP &&
        payload.relationship?.table?.slug
      ) {
        const target = await this.tableRepository.findBySlug(
          payload.relationship.table.slug,
        );
        if (target && target.type === E_TABLE_TYPE.FIELD_GROUP) {
          return left(
            HTTPException.BadRequest(
              'Relacionamento não pode apontar para uma tabela de grupo',
              'RELATIONSHIP_NESTED',
              { relationship: 'Tabela alvo inválida para relacionamento' },
            ),
          );
        }
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

      const existFieldOnTable = table?.fields?.some(
        (field) => field.slug === slug && !field.trashed,
      );

      if (existFieldOnTable)
        return left(
          HTTPException.Conflict('Campo já existe', 'FIELD_ALREADY_EXIST', {
            slug: 'Campo já existe',
          }),
        );

      if (hasDuplicateDropdownLabels(payload.dropdown)) {
        return left(
          HTTPException.Conflict(
            'Opções do dropdown não podem ter nomes duplicados',
            'DROPDOWN_OPTION_ALREADY_EXISTS',
            { dropdown: 'Opção já existe no dropdown' },
          ),
        );
      }

      let field = await this.fieldRepository.create({
        ...payload,
        defaultValue: normalizeDefaultValue(payload.type, payload.defaultValue),
        slug,
        group: null,
      });

      let groups = table.groups || [];

      if (field.type === E_FIELD_TYPE.FIELD_GROUP) {
        // Cria campos nativos para o grupo
        const nativeGroupFields = await this.fieldRepository.createMany(
          FIELD_GROUP_NATIVE_LIST,
        );

        const groupSchema = this.schemaBuilder.build(nativeGroupFields);

        // Adiciona grupo em groups da tabela pai
        const newGroup: IGroupConfiguration = {
          slug,
          name: field.name,
          fields: nativeGroupFields,
          _schema: groupSchema,
        };

        groups = [...groups, newGroup];

        field = await this.fieldRepository.update({
          _id: field._id,
          group: { slug },
        });
      }

      const fields = [...(table.fields ?? []), field];

      const _schema = this.schemaBuilder.build(fields, groups);

      await this.tableRepository.update({
        _id: table._id,
        fields: fields.flatMap((f) => f._id),
        _schema: {
          ...table._schema,
          ..._schema,
        },
        groups,
        owner: table.owner._id,
        fieldOrderList: [...(table.fieldOrderList ?? []), field._id],
        fieldOrderForm: [...(table.fieldOrderForm ?? []), field._id],
        fieldOrderFilter: [...(table.fieldOrderFilter ?? []), field._id],
        fieldOrderDetail: [...(table.fieldOrderDetail ?? []), field._id],
      });

      await this.modelBuilder.build({
        ...table,
        _id: table._id,
        _schema: {
          ...table._schema,
          ..._schema,
        },
        groups,
      });

      // Campo RELATIONSHIP nasce pivô: materializa a definition + o campo-espelho
      // no target e liga os dois lados. Roda depois do update/model da tabela
      // source para suportar auto-relacionamento (target == source carregado
      // fresco dentro do service). Config (onDelete/mirror) vem do payload; sem
      // ela, default seguro onDelete=SET_NULL e espelho single/invisível (1:N).
      if (
        field.type === E_FIELD_TYPE.RELATIONSHIP &&
        field.relationship?.table
      ) {
        const config = field.relationship;
        const materialized = await this.relationshipMaterialization.materialize(
          {
            sourceField: field,
            sourceTable: table,
            onDelete: config.onDelete || E_RELATIONSHIP_ON_DELETE.SET_NULL,
            mirrorMultiple: Boolean(config.mirror?.multiple),
            mirrorVisible: Boolean(config.mirror?.visible),
            mirrorLabel: config.mirror?.label,
          },
        );
        if (materialized.isLeft()) return left(materialized.value);

        const refreshed = await this.fieldRepository.findById(field._id);
        if (refreshed) field = refreshed;
      }

      return right(field);
    } catch (error) {
      console.error('[table-fields > create][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'CREATE_FIELD_ERROR',
        ),
      );
    }
  }
}
