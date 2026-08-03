import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_RELATIONSHIP_ON_DELETE,
  E_TABLE_TYPE,
  type IField as Entity,
  type IField,
  type IGroupConfiguration,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldSlug } from '@application/core/field-slug.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RelationshipMaterializationContractService } from '@application/services/relationship/relationship-materialization-contract.service';
import { ModelBuilderContractService } from '@application/services/table/model-builder-contract.service';
import { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';
import { deleteCascadeDropdownConfigsForField } from '@extensions/forms/plugins/cascade-dropdown/cascade-dropdown-config.model';

import {
  hasDuplicateDropdownLabels,
  normalizeDefaultValue,
} from '../table-field-base.schema';

import type { TableFieldUpdatePayload } from './update.validator';

type Response = Either<HTTPException, Entity>;
type Payload = TableFieldUpdatePayload;

// "Sem valor padrão" não tem uma única representação: dependendo do tipo do
// campo e de como o valor trafega na API, chega como null, undefined, string
// vazia ou array vazio. Semanticamente são todos o mesmo estado (ausência de
// default), então a comparação precisa normalizá-los antes de decidir igualdade.
function isEmptyDefaultValue(v: string | string[] | null | undefined): boolean {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0);
}

function isDefaultValueEqual(
  a: string | string[] | null | undefined,
  b: string | string[] | null | undefined,
): boolean {
  if (isEmptyDefaultValue(a) && isEmptyDefaultValue(b)) return true;
  if (isEmptyDefaultValue(a) || isEmptyDefaultValue(b)) return false;
  if (a === b) return true;
  if (typeof a === 'string' && typeof b === 'string') return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  return false;
}

@Service()
export default class TableFieldUpdateUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly rowRepository: RowContractRepository,
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

      // Sem relacionamento-de-relacionamento (§7): RELATIONSHIP não pode
      // apontar para uma tabela de grupo.
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

      // RELATIONSHIP é sempre top-level (§2): não pode ser movido para dentro de
      // um FIELD_GROUP. Rejeita qualquer tentativa de setar `group` num campo
      // de relacionamento (composição embedded ≠ associação entre tabelas).
      if (payload.type === E_FIELD_TYPE.RELATIONSHIP && payload.group) {
        return left(
          HTTPException.BadRequest(
            'Relacionamento não pode ficar dentro de um grupo de campos',
            'RELATIONSHIP_IN_FIELD_GROUP',
            { group: 'Relacionamento é sempre top-level' },
          ),
        );
      }

      const field = await this.fieldRepository.findById(payload._id);

      if (!field)
        return left(
          HTTPException.NotFound('Campo não encontrado', 'FIELD_NOT_FOUND'),
        );

      if (field.native && payload.trashed) {
        return left(
          HTTPException.Forbidden(
            'Campos nativos não podem ser enviados para a lixeira',
            'NATIVE_FIELD_CANNOT_BE_TRASHED',
          ),
        );
      }

      if (field.native) {
        const updatedField = await this.fieldRepository.update({
          _id: field._id,
          showInFilter: payload.showInFilter,
          // Visibilidade por contexto (list/form/detail) por grupo.
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

        const fields = table.fields.map((f) => {
          if (f._id === field._id) return updatedField;
          return f;
        });
        const groups = table.groups || [];
        const _schema = this.schemaBuilder.build(fields, groups);

        await this.tableRepository.update({
          _id: table._id,
          _schema,
          fields: fields.flatMap((f) => f._id),
          groups,
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

      if (
        table.fields?.filter((f) => !f.trashed).length === 1 &&
        payload.trashed
      ) {
        return left(
          HTTPException.Conflict(
            'Último campo ativo, não pode ser enviado para a lixeira',
            'LAST_ACTIVE_FIELD',
          ),
        );
      }

      // Slug e editavel em campos nao-nativos: honra o `payload.slug` (a
      // "url"/chave tecnica) quando vem pela rota real (`tableSlug` presente).
      // Sem slug, deriva do `name`. Mudanca de slug propaga rename dos dados
      // mais abaixo (oldSlug !== slug). O guard `payload.tableSlug ? ...`
      // espelha o create e evita confundir o slug do campo com o slug da tabela
      // quando o caller passa apenas `slug` (= tabela).
      const oldSlug = field.slug;
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

      const existFieldOnTable = table.fields?.some(
        (item) => item._id !== field._id && item.slug === slug && !item.trashed,
      );

      if (existFieldOnTable) {
        return left(
          HTTPException.Conflict('Campo já existe', 'FIELD_ALREADY_EXIST', {
            slug: 'Campo já existe',
          }),
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

      let normalizedGroup: { slug: string; _id?: string } | null = null;
      if (typeof payload.group === 'string') {
        normalizedGroup = { slug: payload.group };
      } else if (payload.group) {
        normalizedGroup = { slug: payload.group.slug };
        if (payload.group._id) {
          normalizedGroup._id = payload.group._id;
        }
      }

      let updatedField = await this.fieldRepository.update({
        ...payload,
        defaultValue: normalizeDefaultValue(payload.type, payload.defaultValue),
        _id: field._id,
        slug,
        group: normalizedGroup,
        ...(payload.trashed && {
          trashed: payload.trashed,
          required: false,
          showInFilter: false,
          permissions: buildFieldPermissions(false, false, false),
        }),
        ...(payload.trashedAt && { trashedAt: payload.trashedAt }),
      });

      let groups = table.groups || [];

      if (updatedField.type === E_FIELD_TYPE.FIELD_GROUP) {
        const existingGroup = groups.find((g) => g.slug === field.group?.slug);
        const groupId = updatedField._id;

        if (!existingGroup) {
          const newGroup: IGroupConfiguration = {
            _id: groupId,
            slug,
            name: updatedField.name,
            fields: [],
            _schema: {},
          };
          groups = [...groups, newGroup];
        } else {
          groups = groups.map((g) => {
            if (g.slug === existingGroup.slug) {
              return { ...g, _id: groupId, slug, name: updatedField.name };
            }
            return g;
          });
        }

        updatedField = await this.fieldRepository.update({
          _id: updatedField._id,
          group: { slug, _id: groupId },
        });
      }

      const fields = table.fields.map((f) => {
        if (f._id === field._id) return updatedField;
        return f;
      });

      const _schema = this.schemaBuilder.build(fields, groups);

      await this.tableRepository.update({
        _id: table._id,
        _schema,
        fields: fields.flatMap((f) => f._id),
        groups,
        owner: table.owner._id,
      });

      if (oldSlug !== slug) {
        await this.modelBuilder.build({
          ...table,
          _id: table._id,
          _schema,
          groups,
        });
        await this.rowRepository.renameField(table, oldSlug, slug);
      }

      if (payload.trashed) {
        await deleteCascadeDropdownConfigsForField({
          tableSlug,
          fieldId: field._id,
          fieldSlug: field.slug,
        });
      }

      // Config de relacionamento (pivô): se ainda não materializado, materializa
      // (born-pivot tardio); senão, sincroniza onDelete/visibilidade/cardinalidade
      // do espelho na RelationshipDefinition.
      if (
        updatedField.type === E_FIELD_TYPE.RELATIONSHIP &&
        updatedField.relationship?.table &&
        !payload.trashed
      ) {
        const config = updatedField.relationship;
        // `||` (não `??`) p/ cair no default também em '' (denormalizado legado):
        // passar '' à definition estoura a validação de enum do Mongoose.
        const onDelete = config.onDelete || E_RELATIONSHIP_ON_DELETE.SET_NULL;

        if (!config.relationshipId) {
          const materialized =
            await this.relationshipMaterialization.materialize({
              sourceField: updatedField,
              sourceTable: table,
              onDelete,
              mirrorMultiple: Boolean(config.mirror?.multiple),
              mirrorVisible: Boolean(config.mirror?.visible),
              mirrorLabel: config.mirror?.label,
            });
          if (materialized.isLeft()) return left(materialized.value);
        } else {
          const synced = await this.relationshipMaterialization.syncConfig({
            sourceField: updatedField,
            onDelete,
            sourceVisible: config.visible ?? true,
            sourceLabel: updatedField.name,
            mirrorMultiple: Boolean(config.mirror?.multiple),
            mirrorVisible: Boolean(config.mirror?.visible),
            mirrorLabel: config.mirror?.label,
          });
          if (synced.isLeft()) return left(synced.value);
        }

        const refreshed = await this.fieldRepository.findById(updatedField._id);
        if (refreshed) updatedField = refreshed;
      }

      return right(updatedField);
    } catch (error) {
      console.error('[table-fields > update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'UPDATE_FIELD_TABLE_ERROR',
        ),
      );
    }
  }

  private canUpdateLockedField(payload: Payload, field: IField): boolean {
    // Locked fields allow visibility and width changes, block everything else
    if (payload.name !== field.name) return false;
    if (payload.type !== field.type) return false;
    if (payload.trashed || payload.trashedAt) return false;
    if (payload.required !== field.required) return false;
    if (payload.multiple !== field.multiple) return false;
    if (payload.format !== field.format) return false;
    if (!isDefaultValueEqual(payload.defaultValue, field.defaultValue))
      return false;

    // `locked` e gravavel e tem default `false` no Zod e no AJV: um PUT que
    // apenas omitisse a chave destravava o campo e liberava trash/delete.
    if (payload.locked !== field.locked) return false;

    // O slug e a fonte de verdade do guard de row-access (`visibility.fieldSlug`);
    // renomear quebra o filtro. `payload.slug` so e o slug do campo quando vem
    // pela rota real — sem `tableSlug` ele carrega o slug da tabela.
    if (payload.tableSlug && payload.slug && payload.slug !== field.slug)
      return false;
    if (!this.isDropdownEqual(payload.dropdown, field.dropdown)) return false;
    if (!this.isCategoryEqual(payload.category, field.category)) return false;

    // relationship: comparar por _id
    const payloadRelId = payload.relationship?.table?._id ?? null;
    const fieldRelId = field.relationship?.table?._id ?? null;
    if (payloadRelId !== fieldRelId) return false;

    // group: comparar por slug
    let payloadGroupSlug: string | null = null;
    if (typeof payload.group === 'string') {
      payloadGroupSlug = payload.group;
    }
    if (typeof payload.group === 'object') {
      payloadGroupSlug = payload.group?.slug ?? null;
    }
    const fieldGroupSlug = field.group?.slug ?? null;
    if (payloadGroupSlug !== fieldGroupSlug) return false;

    return true;
  }

  /** Compara as opcoes por id e ordem — o guard reescreve o dropdown por posicao. */
  private isDropdownEqual(
    payload: IField['dropdown'],
    current: IField['dropdown'],
  ): boolean {
    if (payload === undefined) return true;

    const next = payload ?? [];
    const previous = current ?? [];
    if (next.length !== previous.length) return false;

    return next.every((option, index) => option.id === previous[index]?.id);
  }

  private isCategoryEqual(
    payload: IField['category'],
    current: IField['category'],
  ): boolean {
    if (payload === undefined) return true;

    const next = payload ?? [];
    const previous = current ?? [];
    if (next.length !== previous.length) return false;

    return next.every((item, index) => item.id === previous[index]?.id);
  }
}
