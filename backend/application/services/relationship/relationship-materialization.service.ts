import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  type IField,
  type ITable,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldSlug } from '@application/core/field-slug.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { RelationshipDefinitionContractRepository } from '@application/repositories/relationship-definition/relationship-definition-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { ModelBuilderContractService } from '@application/services/table/model-builder-contract.service';
import { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';

import type {
  RelationshipMaterializationContractService,
  RelationshipMaterializeParams,
  RelationshipMaterializeResult,
  RelationshipSyncConfigParams,
} from './relationship-materialization-contract.service';

@Service()
export default class RelationshipMaterializationService implements RelationshipMaterializationContractService {
  constructor(
    private readonly fieldRepository: FieldContractRepository,
    private readonly tableRepository: TableContractRepository,
    private readonly definitionRepository: RelationshipDefinitionContractRepository,
    private readonly schemaBuilder: SchemaBuilderContractService,
    private readonly modelBuilder: ModelBuilderContractService,
  ) {}

  async materialize(
    params: RelationshipMaterializeParams,
  ): Promise<Either<HTTPException, RelationshipMaterializeResult>> {
    const {
      sourceField,
      sourceTable,
      onDelete,
      mirrorMultiple,
      mirrorVisible,
      mirrorLabel,
    } = params;
    const mirrorName = mirrorLabel ?? sourceTable.name;

    const ref = sourceField.relationship?.table;
    if (!ref) {
      return left(
        HTTPException.BadRequest(
          'Configuração de relacionamento ausente',
          'RELATIONSHIP_CONFIG_MISSING',
        ),
      );
    }

    const targetTable = await this.loadTargetTable(ref._id, ref.slug);
    if (!targetTable) {
      return left(
        HTTPException.NotFound(
          'Tabela alvo do relacionamento não encontrada',
          'RELATIONSHIP_TARGET_NOT_FOUND',
        ),
      );
    }

    // Guarda de dedup: um campo source deve ter no máximo UMA definition. Se já
    // existe (re-materialização — o gap que gerou as duplicatas nas migrations
    // 15/23 e no double-submit), religa o campo à existente em vez de criar
    // outra def + outro espelho. Idempotente.
    const existing = await this.definitionRepository.findBySourceField(
      sourceField._id,
    );
    if (existing) {
      if (sourceField.relationship?.relationshipId !== existing._id) {
        await this.fieldRepository.update({
          _id: sourceField._id,
          relationship: {
            ...sourceField.relationship,
            table: ref,
            field: sourceField.relationship?.field ?? existing.target.field,
            order: sourceField.relationship?.order ?? 'asc',
            relationshipId: existing._id,
            side: 'source',
          },
        });
      }
      return right({
        definitionId: existing._id,
        mirrorFieldId: existing.target.field._id,
      });
    }

    const mirrorSlug = this.resolveMirrorSlug(
      sourceTable,
      sourceField,
      targetTable,
    );

    // Rótulo do espelho: campo legível da tabela source (não o campo de
    // relacionamento). Fallback para o próprio campo source.
    const mirrorLabelField = this.pickLabelField(sourceTable, {
      _id: sourceField._id,
      slug: sourceField.slug,
    });

    // N:N: ambos multiple=true → espelho gerenciável (formMode=manage).
    let mirrorFormMode: 'select' | 'manage' = 'select';
    if (Boolean(sourceField.multiple) && mirrorMultiple)
      mirrorFormMode = 'manage';

    // 1. Campo-espelho no target (lado oposto).
    const mirror = await this.fieldRepository.create({
      name: mirrorName,
      slug: mirrorSlug,
      type: E_FIELD_TYPE.RELATIONSHIP,
      required: false,
      multiple: mirrorMultiple,
      format: null,
      showInFilter: false,
      permissions: buildFieldPermissions(true, true, true),
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      tip: null,
      locked: false,
      native: false,
      defaultValue: null,
      relationship: {
        table: { _id: sourceTable._id, slug: sourceTable.slug },
        field: mirrorLabelField,
        order: 'asc',
        visible: mirrorVisible,
        relationshipId: null,
        side: 'target',
        onDelete,
        formMode: mirrorFormMode,
        // Espelho do lado oposto (source): deriva a cardinalidade/role.
        mirror: {
          multiple: Boolean(sourceField.multiple),
          visible: true,
          label: sourceField.name,
        },
      },
      dropdown: [],
      allowCustomDropdownOptions: false,
      allowCreateRelationshipRecords: false,
      category: [],
      group: null,
    });

    // 2. RelationshipDefinition (fonte de verdade do vínculo).
    const definition = await this.definitionRepository.create({
      name: `${sourceTable.name} ↔ ${targetTable.name}`,
      source: {
        table: { _id: sourceTable._id, slug: sourceTable.slug },
        field: { _id: sourceField._id, slug: sourceField.slug },
        visible: true,
        label: sourceField.name,
      },
      target: {
        table: { _id: targetTable._id, slug: targetTable.slug },
        field: { _id: mirror._id, slug: mirror.slug },
        visible: mirrorVisible,
        label: mirrorName,
      },
      onDelete,
    });

    // 3. Liga os dois lados à definition.
    await this.fieldRepository.update({
      _id: sourceField._id,
      relationship: {
        ...sourceField.relationship,
        table: ref,
        field:
          sourceField.relationship?.field ??
          this.pickLabelField(targetTable, {
            _id: mirror._id,
            slug: mirror.slug,
          }),
        order: sourceField.relationship?.order ?? 'asc',
        visible: true,
        relationshipId: definition._id,
        side: 'source',
        onDelete,
        // Espelho do lado oposto (target): deriva a cardinalidade/role.
        mirror: {
          multiple: mirrorMultiple,
          visible: mirrorVisible,
          label: mirrorName,
        },
      },
    });
    await this.fieldRepository.update({
      _id: mirror._id,
      relationship: {
        table: { _id: sourceTable._id, slug: sourceTable.slug },
        field: mirrorLabelField,
        order: 'asc',
        visible: mirrorVisible,
        relationshipId: definition._id,
        side: 'target',
        onDelete,
        formMode: mirrorFormMode,
        // Espelho do lado oposto (source): deriva a cardinalidade/role.
        mirror: {
          multiple: Boolean(sourceField.multiple),
          visible: true,
          label: sourceField.name,
        },
      },
    });

    // 4. Injeta o espelho no target (fields + ordens + _schema + model).
    await this.attachMirrorToTarget(targetTable, mirror);

    return right({
      definitionId: definition._id,
      mirrorFieldId: mirror._id,
    });
  }

  async syncConfig(
    params: RelationshipSyncConfigParams,
  ): Promise<Either<HTTPException, true>> {
    const relationshipId = params.sourceField.relationship?.relationshipId;
    if (!relationshipId) {
      return left(
        HTTPException.BadRequest(
          'Campo de relacionamento ainda não materializado',
          'RELATIONSHIP_NOT_MATERIALIZED',
        ),
      );
    }

    const definition = await this.definitionRepository.findById(relationshipId);
    if (!definition) {
      return left(
        HTTPException.NotFound(
          'Definição de relacionamento não encontrada',
          'RELATIONSHIP_DEFINITION_NOT_FOUND',
        ),
      );
    }

    const mirrorLabel = params.mirrorLabel ?? definition.target.label;

    await this.definitionRepository.update({
      _id: definition._id,
      onDelete: params.onDelete,
      source: {
        ...definition.source,
        visible: params.sourceVisible,
        label: params.sourceLabel,
      },
      target: {
        ...definition.target,
        visible: params.mirrorVisible,
        label: mirrorLabel,
      },
    });

    // Sincroniza o espelho denormalizado do campo source: deriva do lado oposto
    // (target), cujo `multiple` acabou de mudar.
    await this.fieldRepository.update({
      _id: params.sourceField._id,
      relationship: {
        ...params.sourceField.relationship,
        table:
          params.sourceField.relationship?.table ?? definition.target.table,
        field:
          params.sourceField.relationship?.field ?? definition.target.field,
        order: params.sourceField.relationship?.order ?? 'asc',
        visible: params.sourceVisible,
        relationshipId: definition._id,
        side: 'source',
        onDelete: params.onDelete,
        mirror: {
          multiple: params.mirrorMultiple,
          visible: params.mirrorVisible,
          label: mirrorLabel,
        },
      },
    });

    // Atualiza o campo-espelho: multiple (cardinalidade) + visibilidade +
    // espelho denormalizado (lado oposto = source).
    const mirror = await this.fieldRepository.findById(
      definition.target.field._id,
    );
    if (mirror) {
      let mirrorFormMode: 'select' | 'manage' = 'select';
      if (Boolean(params.sourceField.multiple) && params.mirrorMultiple)
        mirrorFormMode = 'manage';

      await this.fieldRepository.update({
        _id: mirror._id,
        multiple: params.mirrorMultiple,
        relationship: {
          ...mirror.relationship,
          table: mirror.relationship?.table ?? definition.source.table,
          field: mirror.relationship?.field ?? definition.source.field,
          order: mirror.relationship?.order ?? 'asc',
          visible: params.mirrorVisible,
          relationshipId: definition._id,
          side: 'target',
          onDelete: params.onDelete,
          formMode: mirrorFormMode,
          mirror: {
            multiple: Boolean(params.sourceField.multiple),
            visible: params.sourceVisible,
            label: params.sourceLabel,
          },
        },
      });
    }

    return right(true);
  }

  private async loadTargetTable(
    _id: string | undefined,
    slug: string | undefined,
  ): Promise<ITable | null> {
    if (_id) {
      const byId = await this.tableRepository.findById(_id);
      if (byId) return byId;
    }
    if (slug) return this.tableRepository.findBySlug(slug);
    return null;
  }

  // Campo da tabela usado como rótulo das opções do outro lado. Sem seletor
  // manual (removido da UI): rowSlug, senão 1º texto, senão 1º não-nativo, senão
  // o fallback informado (o próprio campo de relacionamento).
  private pickLabelField(
    table: ITable,
    fallback: { _id: string; slug: string },
  ): { _id: string; slug: string } {
    const fields = table.fields ?? [];
    if (table.rowSlugFieldId) {
      const slugField = fields.find((f) => f._id === table.rowSlugFieldId);
      if (slugField) return { _id: slugField._id, slug: slugField.slug };
    }
    const textField = fields.find(
      (f) => !f.native && !f.trashed && f.type === E_FIELD_TYPE.TEXT_SHORT,
    );
    if (textField) return { _id: textField._id, slug: textField.slug };
    const anyField = fields.find((f) => !f.native && !f.trashed);
    if (anyField) return { _id: anyField._id, slug: anyField.slug };
    return fallback;
  }

  private resolveMirrorSlug(
    sourceTable: ITable,
    sourceField: IField,
    targetTable: ITable,
  ): string {
    const base = FieldSlug.resolve({
      name: `${sourceTable.name} ${sourceField.name}`,
    });
    let slug = base.slug;
    const used = new Set((targetTable.fields ?? []).map((f) => f.slug));
    let suffix = 1;
    while (used.has(slug)) {
      slug = `${base.slug}-${suffix}`;
      suffix++;
    }
    return slug;
  }

  private async attachMirrorToTarget(
    targetTable: ITable,
    mirror: IField,
  ): Promise<void> {
    const fields = [...(targetTable.fields ?? []), mirror];
    const groups = targetTable.groups ?? [];
    const schema = this.schemaBuilder.build(fields, groups);

    await this.tableRepository.update({
      _id: targetTable._id,
      _schema: { ...targetTable._schema, ...schema },
      fields: fields.flatMap((f) => f._id),
      groups,
      owner: targetTable.owner._id,
      fieldOrderList: [...(targetTable.fieldOrderList ?? []), mirror._id],
      fieldOrderForm: [...(targetTable.fieldOrderForm ?? []), mirror._id],
      fieldOrderFilter: [...(targetTable.fieldOrderFilter ?? []), mirror._id],
      fieldOrderDetail: [...(targetTable.fieldOrderDetail ?? []), mirror._id],
    });

    await this.modelBuilder.build({
      ...targetTable,
      _id: targetTable._id,
      _schema: { ...targetTable._schema, ...schema },
      groups,
    });
  }
}
