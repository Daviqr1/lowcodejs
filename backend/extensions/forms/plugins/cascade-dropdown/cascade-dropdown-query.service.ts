import { Service } from 'fastify-decorators';
import type mongoose from 'mongoose';

import {
  E_FIELD_TYPE,
  type IField,
  type IRow,
  type ITable,
} from '@application/core/entity.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { DateContractService } from '@application/services/date/date-contract.service';
import { ModelBuilderContractService } from '@application/services/table/model-builder-contract.service';
import type { Entity } from '@application/services/table/model-builder.service';
import { QueryBuilderContractService } from '@application/services/table/query-builder-contract.service';

import { CascadeDropdownConfigContractRepository } from './cascade-dropdown-config-contract.repository';
import {
  type CascadeQueryOptions,
  CascadeDropdownQueryContractService,
} from './cascade-dropdown-query-contract.service';
import type {
  CascadeDropdownConfig,
  CascadeDropdownFilter,
} from './cascade-dropdown.types';

/** Tipos que casam com `$in`/`$nin` em vez de igualdade escalar. */
const MULTI_VALUE_TYPES = new Set<string>([
  E_FIELD_TYPE.DROPDOWN,
  E_FIELD_TYPE.CATEGORY,
  E_FIELD_TYPE.RELATIONSHIP,
  E_FIELD_TYPE.USER,
]);

const TEXT_TYPES = new Set<string>([
  E_FIELD_TYPE.TEXT_SHORT,
  E_FIELD_TYPE.TEXT_LONG,
]);

@Service()
export default class CascadeDropdownQueryService implements CascadeDropdownQueryContractService {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly configRepository: CascadeDropdownConfigContractRepository,
    private readonly modelBuilder: ModelBuilderContractService,
    private readonly queryBuilder: QueryBuilderContractService,
    private readonly dateService: DateContractService,
  ) {}

  fieldId(field: IField): string {
    return String(field._id);
  }

  findFieldByIdOrSlug(
    fields: IField[],
    id: string,
    slug: string,
  ): IField | undefined {
    return fields.find(
      (field) => this.fieldId(field) === id || field.slug === slug,
    );
  }

  compactString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  toValueArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => this.compactString(item)).filter(Boolean);
    }
    const compacted = this.compactString(value);
    if (compacted) return [compacted];
    return [];
  }

  private buildEmptyQuery(operator: 'is_empty' | 'is_not_empty'): object {
    const emptyValues = [null, '', []];
    if (operator === 'is_empty') return { $in: emptyValues };
    return { $nin: emptyValues };
  }

  buildFieldCondition(
    field: IField,
    filter: Pick<
      CascadeDropdownFilter,
      'operator' | 'value' | 'values' | 'dateStart' | 'dateEnd'
    >,
  ): unknown {
    let values: string[] = [];
    if (filter.values.length > 0) values = filter.values;
    if (filter.value) values.push(filter.value);

    if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty') {
      return this.buildEmptyQuery(filter.operator);
    }

    if (TEXT_TYPES.has(field.type) && filter.operator === 'contains') {
      return {
        $regex: this.queryBuilder.normalize(filter.value ?? ''),
        $options: 'i',
      };
    }

    if (filter.operator === 'date_between') {
      const range: { $gte?: Date; $lte?: Date } = {};
      if (filter.dateStart) {
        range.$gte = this.dateService.startOfDay(filter.dateStart);
      }
      if (filter.dateEnd) {
        range.$lte = this.dateService.endOfDay(filter.dateEnd);
      }
      return range;
    }

    if (MULTI_VALUE_TYPES.has(field.type)) {
      if (filter.operator === 'not_equals') return { $nin: values };
      return { $in: values };
    }

    if (filter.operator === 'not_equals') return { $ne: filter.value };
    return filter.value;
  }

  buildQueryFromConfig(
    table: ITable,
    config: CascadeDropdownConfig,
    options?: CascadeQueryOptions,
  ): Record<string, unknown> {
    const query: Record<string, unknown> = { trashed: { $ne: true } };
    const fields = table.fields ?? [];

    for (const filter of config.filters ?? []) {
      const field = this.findFieldByIdOrSlug(
        fields,
        filter.fieldId,
        filter.fieldSlug,
      );
      if (!field || field.trashed) continue;
      query[field.slug] = this.buildFieldCondition(field, filter);
    }

    if (options?.parentValue) {
      const filterField = this.findFieldByIdOrSlug(
        fields,
        config.childFieldId,
        config.childFieldSlug,
      );
      if (filterField) {
        if (MULTI_VALUE_TYPES.has(filterField.type)) {
          query[filterField.slug] = { $in: [options.parentValue] };
        } else {
          query[filterField.slug] = options.parentValue;
        }
      }
    }

    if (
      options?.search &&
      options.childField &&
      TEXT_TYPES.has(options.childField.type)
    ) {
      query[options.childField.slug] = {
        $regex: this.queryBuilder.normalize(options.search),
        $options: 'i',
      };
    }

    return query;
  }

  async getModel(table: ITable): Promise<mongoose.Model<Entity>> {
    return this.modelBuilder.build(table);
  }

  transformRows(
    rows: Array<{ toJSON(opts: { flattenObjectIds: boolean }): IRow }>,
  ): IRow[] {
    return rows.map((row) => row.toJSON({ flattenObjectIds: true }));
  }

  getConfiguredOptionLabel(field: IField, value: string): string {
    if (field.type === E_FIELD_TYPE.DROPDOWN) {
      return field.dropdown?.find((item) => item.id === value)?.label ?? value;
    }

    if (field.type === E_FIELD_TYPE.CATEGORY) {
      const stack = [...(field.category ?? [])];
      while (stack.length > 0) {
        const item = stack.shift();
        if (!item) continue;
        if (item.id === value) return item.label;
        stack.push(...(item.children ?? []));
      }
    }

    return value;
  }

  async getRelationshipOptionLabels(
    field: IField,
    values: string[],
  ): Promise<Map<string, string>> {
    const labels = new Map<string, string>();
    const relationshipTableSlug = field.relationship?.table?.slug;
    const relationshipFieldSlug = field.relationship?.field?.slug;

    if (
      !relationshipTableSlug ||
      !relationshipFieldSlug ||
      values.length === 0
    ) {
      return labels;
    }

    const relationshipTable = await this.tableRepository.findBySlug(
      relationshipTableSlug,
    );
    if (!relationshipTable) return labels;

    const model = await this.getModel(relationshipTable);
    const rows = await model.find({ _id: { $in: values } });

    for (const row of this.transformRows(rows)) {
      labels.set(
        String(row._id),
        this.compactString(row[relationshipFieldSlug]),
      );
    }

    return labels;
  }

  async findUsableConfig(
    targetTableSlug: string,
    targetFieldId: string,
  ): Promise<CascadeDropdownConfig | null> {
    const config = await this.configRepository.findByTarget(
      targetTableSlug,
      targetFieldId,
    );
    if (!config) return null;

    const [targetTable, sourceTable] = await Promise.all([
      this.tableRepository.findBySlug(targetTableSlug),
      this.tableRepository.findBySlug(config.sourceTableSlug),
    ]);
    if (!targetTable || !sourceTable) return null;

    const targetField = this.findFieldByIdOrSlug(
      targetTable.fields,
      config.targetFieldId,
      config.targetFieldSlug,
    );
    const parentField = this.findFieldByIdOrSlug(
      targetTable.fields,
      config.parentFieldId,
      config.parentFieldSlug,
    );
    const childField = this.findFieldByIdOrSlug(
      sourceTable.fields,
      config.childFieldId,
      config.childFieldSlug,
    );

    if (!targetField || !parentField || !childField) return null;

    const usable = [targetField, parentField, childField].every(
      (field) =>
        !field.trashed &&
        !field.native &&
        field.type === E_FIELD_TYPE.RELATIONSHIP,
    );
    if (!usable) return null;

    if (targetField.relationship?.table?.slug !== config.sourceTableSlug) {
      return null;
    }

    const parentRelationshipTable = parentField.relationship?.table?.slug;
    const childRelationshipTable = childField.relationship?.table?.slug;
    if (
      !parentRelationshipTable ||
      !childRelationshipTable ||
      parentRelationshipTable !== childRelationshipTable
    ) {
      return null;
    }

    return config;
  }
}
