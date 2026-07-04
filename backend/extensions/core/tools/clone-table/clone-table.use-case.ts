/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';
import slugify from 'slugify';

import { left, right } from '@application/core/either.core';
import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  FIELD_NATIVE_LIST,
  type IField,
  type IGroupConfiguration,
  type ILayoutFields,
  type ITable,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import {
  TableContractRepository,
  TableCreatePayload,
} from '@application/repositories/table/table-contract.repository';
import { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';

import {
  CALENDAR_TEMPLATE_ID,
  CARDS_TEMPLATE_ID,
  DOCUMENT_TEMPLATE_ID,
  FORUM_TEMPLATE_ID,
  KANBAN_TEMPLATE_ID,
  MOSAIC_TEMPLATE_ID,
} from './clone-table.constants';
import type {
  CloneTableDeps,
  CloneTableResponse,
  CloneTableUseCasePayload,
} from './clone-table.types';
import { createCalendarTemplate } from './templates/calendar-template';
import { createCardsTemplate } from './templates/cards-template';
import { createDocumentTemplate } from './templates/document-template';
import { createForumTemplate } from './templates/forum-template';
import { createKanbanTemplate } from './templates/kanban-template';
import { createMosaicTemplate } from './templates/mosaic-template';

type Response = CloneTableResponse;

type CloneContext = {
  baseTable: ITable;
  table: ITable;
  fields: IField[];
  groups: IGroupConfiguration[];
  fieldIdMap: Record<string, string>;
};

type CopiedRowsByTable = Map<string, Map<string, string>>;

@Service()
export default class CloneTableUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly schemaBuilder: SchemaBuilderContractService,
  ) {}

  private getTemplateDeps(): CloneTableDeps {
    return {
      tableRepository: this.tableRepository,
      fieldRepository: this.fieldRepository,
      rowRepository: this.rowRepository,
      schemaBuilder: this.schemaBuilder,
    };
  }

  async execute(payload: CloneTableUseCasePayload): Promise<Response> {
    try {
      if (!payload.ownerId) {
        return left(
          HTTPException.BadRequest(
            'Owner ID é obrigatório',
            'OWNER_ID_REQUIRED',
          ),
        );
      }

      if (!payload.baseTableIds?.length) {
        const slug = slugify(payload.name, {
          lower: true,
          strict: true,
          trim: true,
        });
        const existingTable = await this.tableRepository.findBySlug(slug);
        if (existingTable) {
          return left(
            HTTPException.Conflict(
              'Já existe uma tabela com este nome',
              'TABLE_ALREADY_EXISTS',
              { name: 'Já existe uma tabela com este nome' },
            ),
          );
        }
      }

      const templateDeps = this.getTemplateDeps();

      if (payload.baseTableId === KANBAN_TEMPLATE_ID) {
        return await createKanbanTemplate(payload, templateDeps);
      }

      if (payload.baseTableId === CARDS_TEMPLATE_ID) {
        return await createCardsTemplate(payload, templateDeps);
      }

      if (payload.baseTableId === MOSAIC_TEMPLATE_ID) {
        return await createMosaicTemplate(payload, templateDeps);
      }

      if (payload.baseTableId === DOCUMENT_TEMPLATE_ID) {
        return await createDocumentTemplate(payload, templateDeps);
      }

      if (payload.baseTableId === FORUM_TEMPLATE_ID) {
        return await createForumTemplate(payload, templateDeps);
      }

      if (payload.baseTableId === CALENDAR_TEMPLATE_ID) {
        return await createCalendarTemplate(payload, templateDeps);
      }

      let requestedBaseTableIds: string[] = [];
      if (payload.baseTableIds?.length) {
        requestedBaseTableIds = [...new Set(payload.baseTableIds)];
      }
      if (!payload.baseTableIds?.length && payload.baseTableId) {
        requestedBaseTableIds = [payload.baseTableId];
      }
      const baseTables = await this.expandTablesWithRelationships(
        requestedBaseTableIds,
      );
      const baseTableIds = baseTables.map((table) => table._id);

      const isBatchClone = Boolean(payload.baseTableIds?.length);
      const cloneContexts: CloneContext[] = [];

      for (const baseTable of baseTables) {
        const cloneName = await this.buildCloneName({
          baseName: baseTable.name,
          name: payload.name ?? '',
          usePrefix: isBatchClone || baseTableIds.length > 1,
        });

        const context = await this.cloneExistingTable({
          baseTable,
          name: cloneName,
          ownerId: payload.ownerId,
        });

        cloneContexts.push(context);
      }

      const remappedContexts =
        await this.remapClonedRelationships(cloneContexts);

      const firstContext = remappedContexts[0];
      if (!firstContext) {
        return left(
          HTTPException.BadRequest(
            'Selecione ao menos uma tabela base',
            'TABLE_REQUIRED',
          ),
        );
      }

      await this.copySelectedRows({
        contexts: remappedContexts,
        requestedCopyDataTableIds: payload.copyDataTableIds ?? [],
      });

      return right({
        table: firstContext.table,
        tables: remappedContexts.map((context) => context.table),
        fieldIdMap: firstContext.fieldIdMap,
        fieldIdMaps: remappedContexts.reduce<
          Record<string, Record<string, string>>
        >((acc, context) => {
          acc[context.baseTable._id] = context.fieldIdMap;
          return acc;
        }, {}),
      });
    } catch (error) {
      if (error instanceof HTTPException) {
        return left(error);
      }

      console.error('[tools > clone-table][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao clonar tabela',
          'CLONE_TABLE_ERROR',
        ),
      );
    }
  }

  private async cloneExistingTable({
    baseTable,
    name,
    ownerId,
  }: {
    baseTable: ITable;
    name: string;
    ownerId: string;
  }): Promise<CloneContext> {
    const newSlug = slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    });

    const { nativeFields, nativeFieldIds } = await this.createNativeFields();

    const nativeIdMap: Record<string, string> = {};
    const baseNativeFields = baseTable.fields.filter((f) => f.native);
    for (const baseNative of baseNativeFields) {
      const matched = nativeFields.find((nf) => nf.slug === baseNative.slug);
      if (matched) {
        nativeIdMap[baseNative._id] = matched._id;
      }
    }

    const nonNativeFields = baseTable.fields.filter(
      (f) => !f.native && !f.trashed,
    );

    const { newFieldIds, fieldIdMap, clonedFields } =
      await this.cloneFields(nonNativeFields);

    const combinedFieldIdMap = { ...nativeIdMap, ...fieldIdMap };

    const clonedGroups = await this.cloneGroups(
      baseTable.groups,
      clonedFields,
      combinedFieldIdMap,
    );

    const _schema = this.schemaBuilder.build(
      [...nativeFields, ...clonedFields],
      clonedGroups,
    );

    const orderList = this.remapFieldIds(
      baseTable.fieldOrderList,
      combinedFieldIdMap,
    );

    const orderForm = this.remapFieldIds(
      baseTable.fieldOrderForm,
      combinedFieldIdMap,
    );

    const orderFilter = this.remapFieldIds(
      baseTable.fieldOrderFilter,
      combinedFieldIdMap,
    );

    const orderDetail = this.remapFieldIds(
      baseTable.fieldOrderDetail,
      combinedFieldIdMap,
    );

    const createPayload: TableCreatePayload = {
      _schema,
      name,
      slug: newSlug,
      description: baseTable.description ?? null,
      type: baseTable.type,
      logo: baseTable.logo?._id ?? null,
      fields: [...nativeFieldIds, ...newFieldIds],
      style: baseTable.style,
      permissions: baseTable.permissions,
      members: baseTable.members,
      owner: ownerId,
      fieldOrderList: orderList,
      fieldOrderForm: orderForm,
      fieldOrderFilter: orderFilter,
      fieldOrderDetail: orderDetail,
      methods: baseTable.methods,
      groups: clonedGroups,
      order: this.remapOrder(baseTable.order, combinedFieldIdMap),
      layoutFields: this.remapLayoutFields(
        baseTable.layoutFields,
        combinedFieldIdMap,
      ),
    };

    const newTable = await this.tableRepository.create(createPayload);

    return {
      baseTable,
      table: newTable,
      fields: [...nativeFields, ...clonedFields],
      groups: clonedGroups,
      fieldIdMap: combinedFieldIdMap,
    };
  }

  private async expandTablesWithRelationships(
    tableIds: string[],
  ): Promise<ITable[]> {
    const result = new Map<string, ITable>();
    const queue = [...new Set(tableIds)];

    while (queue.length > 0) {
      const tableId = queue.shift()!;
      if (result.has(tableId)) continue;

      const table = await this.tableRepository.findById(tableId);
      if (!table) {
        throw HTTPException.NotFound(
          'Tabela base não encontrada',
          'TABLE_NOT_FOUND',
        );
      }

      result.set(table._id, table);

      for (const relationshipField of this.getRelationshipFields(table)) {
        const relatedTableId = relationshipField.relationship?.table?._id;
        if (relatedTableId && !result.has(relatedTableId)) {
          queue.push(relatedTableId);
        }
      }
    }

    return Array.from(result.values());
  }

  private getRelationshipFields(table: ITable): IField[] {
    const fields: IField[] = [];

    for (const field of table.fields ?? []) {
      if (field.type === E_FIELD_TYPE.RELATIONSHIP && !field.trashed) {
        fields.push(field);
      }
    }

    for (const group of table.groups ?? []) {
      for (const field of group.fields ?? []) {
        if (field.type === E_FIELD_TYPE.RELATIONSHIP && !field.trashed) {
          fields.push(field);
        }
      }
    }

    return fields;
  }

  private async cloneFields(fields: IField[]): Promise<{
    newFieldIds: string[];
    fieldIdMap: Record<string, string>;
    clonedFields: IField[];
  }> {
    const newFieldIds: string[] = [];
    const fieldIdMap: Record<string, string> = {};
    const clonedFields: IField[] = [];

    if (!fields || !Array.isArray(fields)) {
      return { newFieldIds, fieldIdMap, clonedFields };
    }

    for (const field of fields) {
      const createdField = await this.fieldRepository.create({
        name: field.name,
        slug: field.slug,
        type: field.type,
        required: field.required,
        multiple: field.multiple,
        format: field.format,
        validations: field.validations,
        permissions:
          field.permissions ?? buildFieldPermissions(true, true, true),
        showInFilter: field.showInFilter,
        defaultValue: field.defaultValue,
        locked: field.locked,
        relationship: field.relationship,
        dropdown: field.dropdown,
        category: field.category,
        group: field.group,
        widthInForm: field.widthInForm,
        widthInList: field.widthInList,
        widthInDetail: field.widthInDetail,
      });

      newFieldIds.push(createdField._id);
      fieldIdMap[field._id] = createdField._id;
      clonedFields.push(createdField);
    }

    return { newFieldIds, fieldIdMap, clonedFields };
  }

  private async createNativeFields(): Promise<{
    nativeFields: IField[];
    nativeFieldIds: string[];
  }> {
    const nativeFields =
      await this.fieldRepository.createMany(FIELD_NATIVE_LIST);
    const nativeFieldIds = nativeFields.flatMap((f) => f._id);
    return { nativeFields, nativeFieldIds };
  }

  private remapFieldIds(
    ids: string[] | undefined,
    map: Record<string, string>,
  ): string[] {
    if (!Array.isArray(ids)) return [];

    return ids.map((id) => map[id]).filter(Boolean);
  }

  private remapOrder(
    order: ITable['order'] | undefined,
    map: Record<string, string>,
  ): ITable['order'] {
    if (!order?.field) return null;

    const field = map[order.field];
    if (!field) return null;

    return { field, direction: order.direction };
  }

  private remapLayoutFields(
    layoutFields: ILayoutFields | undefined,
    map: Record<string, string>,
  ): ILayoutFields | undefined {
    if (!layoutFields) return undefined;

    const remap = (value: string | null): string | null => {
      if (!value) return null;
      return map[value] ?? null;
    };

    return {
      title: remap(layoutFields.title),
      description: remap(layoutFields.description),
      cover: remap(layoutFields.cover),
      category: remap(layoutFields.category),
      startDate: remap(layoutFields.startDate),
      endDate: remap(layoutFields.endDate),
      color: remap(layoutFields.color),
      participants: remap(layoutFields.participants),
      reminder: remap(layoutFields.reminder),
    };
  }

  private async buildCloneName({
    baseName,
    name,
    usePrefix,
  }: {
    baseName: string;
    name: string;
    usePrefix: boolean;
  }): Promise<string> {
    const trimmedName = name.trim();
    let candidate = trimmedName || `Clone de ${baseName}`;
    if (usePrefix && trimmedName) candidate = `${trimmedName}${baseName}`;
    if (usePrefix && !trimmedName) candidate = `Clone de ${baseName}`;

    return this.ensureUniqueTableName(candidate);
  }

  private async ensureUniqueTableName(name: string): Promise<string> {
    let candidate = name;
    let suffix = 2;

    while (
      await this.tableRepository.findBySlug(
        slugify(candidate, {
          lower: true,
          strict: true,
          trim: true,
        }),
      )
    ) {
      candidate = `${name} ${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private async remapClonedRelationships(
    contexts: CloneContext[],
  ): Promise<CloneContext[]> {
    if (contexts.length === 0) return contexts;

    const tableIdMap = new Map(
      contexts.map((context) => [context.baseTable._id, context.table]),
    );

    const fieldIdMap = contexts.reduce<Record<string, string>>(
      (acc, context) => ({ ...acc, ...context.fieldIdMap }),
      {},
    );

    const refreshedContexts: CloneContext[] = [];

    for (const context of contexts) {
      const fieldsToRefresh = new Map<string, IField>();
      for (const field of context.fields) fieldsToRefresh.set(field._id, field);
      for (const group of context.groups) {
        for (const field of group.fields ?? []) {
          fieldsToRefresh.set(field._id, field);
        }
      }

      const refreshedFieldsById = new Map<string, IField>();
      let changed = false;

      for (const field of fieldsToRefresh.values()) {
        if (
          field.type !== E_FIELD_TYPE.RELATIONSHIP ||
          !field.relationship?.table?._id
        ) {
          refreshedFieldsById.set(field._id, field);
          continue;
        }

        const clonedTargetTable = tableIdMap.get(field.relationship.table._id);
        if (!clonedTargetTable) {
          refreshedFieldsById.set(field._id, field);
          continue;
        }

        const mappedTargetFieldId =
          fieldIdMap[field.relationship.field._id] ??
          field.relationship.field._id;

        const updatedField = await this.fieldRepository.update({
          _id: field._id,
          relationship: {
            table: {
              _id: clonedTargetTable._id,
              slug: clonedTargetTable.slug,
            },
            field: {
              _id: mappedTargetFieldId,
              slug: field.relationship.field.slug,
            },
            order: field.relationship.order,
          },
        });

        refreshedFieldsById.set(updatedField._id, updatedField);
        changed = true;
      }

      if (!changed) {
        refreshedContexts.push(context);
        continue;
      }

      const refreshedFields = context.fields.map(
        (field) => refreshedFieldsById.get(field._id) ?? field,
      );

      const refreshedGroups = context.groups.map((group) => {
        const fields = group.fields
          .map((field) => refreshedFieldsById.get(field._id) ?? field)
          .filter((field): field is IField => Boolean(field));

        return {
          ...group,
          fields,
          _schema: this.schemaBuilder.build(fields),
        };
      });

      const updatedSchema = this.schemaBuilder.build(
        refreshedFields,
        refreshedGroups,
      );

      const updatedTable = await this.tableRepository.update({
        _id: context.table._id,
        _schema: updatedSchema,
        groups: refreshedGroups,
      });

      refreshedContexts.push({
        ...context,
        table: updatedTable,
        fields: refreshedFields,
        groups: refreshedGroups,
      });
    }

    return refreshedContexts;
  }

  private async copySelectedRows({
    contexts,
    requestedCopyDataTableIds,
  }: {
    contexts: CloneContext[];
    requestedCopyDataTableIds: string[];
  }): Promise<void> {
    if (requestedCopyDataTableIds.length === 0) return;

    const contextsByBaseId = new Map(
      contexts.map((context) => [context.baseTable._id, context]),
    );
    const copyDataTableIds = this.expandDataCopyTableIds({
      contextsByBaseId,
      requestedCopyDataTableIds,
    });

    const copiedRowsByTable: CopiedRowsByTable = new Map();
    const copiedRows: Array<{
      context: CloneContext;
      sourceRow: Record<string, unknown>;
      clonedRowId: string;
    }> = [];

    for (const context of contexts) {
      if (!copyDataTableIds.has(context.baseTable._id)) continue;

      const rows = await this.rowRepository.findAllRaw(context.baseTable);
      const rowIdMap = new Map<string, string>();
      copiedRowsByTable.set(context.baseTable._id, rowIdMap);

      for (const row of rows) {
        const clonedRow = await this.rowRepository.insertRaw(
          context.table,
          row,
        );
        rowIdMap.set(String(row._id), clonedRow._id);
        copiedRows.push({
          context,
          sourceRow: row,
          clonedRowId: clonedRow._id,
        });
      }
    }

    for (const copiedRow of copiedRows) {
      const data = this.remapRowRelationshipValues({
        context: copiedRow.context,
        row: copiedRow.sourceRow,
        copiedRowsByTable,
      });

      await this.rowRepository.update({
        table: copiedRow.context.table,
        _id: copiedRow.clonedRowId,
        data,
      });
    }
  }

  private expandDataCopyTableIds({
    contextsByBaseId,
    requestedCopyDataTableIds,
  }: {
    contextsByBaseId: Map<string, CloneContext>;
    requestedCopyDataTableIds: string[];
  }): Set<string> {
    const result = new Set<string>();
    const queue = [...new Set(requestedCopyDataTableIds)];

    while (queue.length > 0) {
      const tableId = queue.shift()!;
      if (result.has(tableId)) continue;

      const context = contextsByBaseId.get(tableId);
      if (!context) continue;

      result.add(tableId);

      for (const relationshipField of this.getRelationshipFields(
        context.baseTable,
      )) {
        const relatedTableId = relationshipField.relationship?.table?._id;
        if (relatedTableId && !result.has(relatedTableId)) {
          queue.push(relatedTableId);
        }
      }
    }

    return result;
  }

  private remapRowRelationshipValues({
    context,
    row,
    copiedRowsByTable,
  }: {
    context: CloneContext;
    row: Record<string, unknown>;
    copiedRowsByTable: CopiedRowsByTable;
  }): Record<string, unknown> {
    const data = { ...row };

    delete data._id;
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;

    for (const field of context.baseTable.fields ?? []) {
      if (field.type === E_FIELD_TYPE.RELATIONSHIP) {
        data[field.slug] = this.remapRelationshipValue({
          value: data[field.slug],
          field,
          copiedRowsByTable,
        });
        continue;
      }

      if (field.type !== E_FIELD_TYPE.FIELD_GROUP || !field.group?.slug) {
        continue;
      }

      const group = context.baseTable.groups?.find(
        (candidate) => candidate.slug === field.group?.slug,
      );
      if (!group) continue;

      const groupRows = data[field.slug];
      if (!Array.isArray(groupRows)) continue;

      data[field.slug] = groupRows.map((groupRow) => {
        if (!this.isRecord(groupRow)) return groupRow;

        const nextGroupRow = { ...groupRow };
        for (const groupField of group.fields ?? []) {
          if (groupField.type !== E_FIELD_TYPE.RELATIONSHIP) continue;
          nextGroupRow[groupField.slug] = this.remapRelationshipValue({
            value: nextGroupRow[groupField.slug],
            field: groupField,
            copiedRowsByTable,
          });
        }
        return nextGroupRow;
      });
    }

    return data;
  }

  private remapRelationshipValue({
    value,
    field,
    copiedRowsByTable,
  }: {
    value: unknown;
    field: IField;
    copiedRowsByTable: CopiedRowsByTable;
  }): unknown {
    const relatedTableId = field.relationship?.table?._id;
    if (!relatedTableId) return value;

    const rowIdMap = copiedRowsByTable.get(relatedTableId);
    if (!rowIdMap) return value;

    if (Array.isArray(value)) {
      return value.map((item) => rowIdMap.get(String(item))).filter(Boolean);
    }

    if (value === null || value === undefined || value === '') {
      return value;
    }

    return rowIdMap.get(String(value)) ?? null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private async cloneGroups(
    groups: IGroupConfiguration[] | undefined,
    clonedFields: IField[],
    fieldIdMap: Record<string, string>,
  ): Promise<IGroupConfiguration[]> {
    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return [];
    }

    const clonedFieldMap = new Map(
      clonedFields.map((field) => [field._id, field]),
    );

    const clonedGroups: IGroupConfiguration[] = [];

    for (const group of groups) {
      const groupFields: IField[] = [];

      for (const field of group.fields ?? []) {
        if (field.trashed) continue;

        const existingId = fieldIdMap[field._id];
        if (existingId) {
          const mapped = clonedFieldMap.get(existingId);
          if (mapped) groupFields.push(mapped);
          continue;
        }

        const createdField = await this.fieldRepository.create({
          name: field.name,
          slug: field.slug,
          type: field.type,
          required: field.required,
          multiple: field.multiple,
          format: field.format,
          validations: field.validations,
          permissions:
            field.permissions ?? buildFieldPermissions(true, true, true),
          showInFilter: field.showInFilter,
          defaultValue: field.defaultValue,
          locked: field.locked,
          native: field.native,
          relationship: field.relationship,
          dropdown: field.dropdown,
          category: field.category,
          group: field.group,
          widthInForm: field.widthInForm,
          widthInList: field.widthInList,
          widthInDetail: field.widthInDetail,
        });

        fieldIdMap[field._id] = createdField._id;
        clonedFieldMap.set(createdField._id, createdField);
        groupFields.push(createdField);
      }

      clonedGroups.push({
        slug: group.slug,
        name: group.name,
        fields: groupFields,
        _schema: this.schemaBuilder.build(groupFields),
      });
    }

    return clonedGroups;
  }
}
