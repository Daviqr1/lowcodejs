import {
  buildFieldPermissions,
  E_TABLE_STYLE,
  type IField,
  type IGroupConfiguration,
  type ITable,
  type Merge,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import type { TableFieldUpdatePayload } from '@application/features/table-fields/_shared.validator';

import { makeFieldGroupField } from './field-factory.helper';

type TableOverrides = Partial<
  Merge<
    Record<string, unknown>,
    {
      name: string;
      slug: string;
      owner: string;
    }
  >
>;

export async function makeTable(
  repo: TableInMemoryRepository,
  fields: IField[],
  overrides?: TableOverrides,
): Promise<ITable> {
  const table = await repo.create({
    name: overrides?.name ?? 'Tabela Teste',
    slug: overrides?.slug ?? 'tabela-teste',
    _schema: {},
    fields: fields.map((f) => f._id),
    owner: overrides?.owner ?? 'owner-id',
    style: E_TABLE_STYLE.LIST,
    fieldOrderList: [],
    fieldOrderForm: [],
  });

  // Seta os objetos IField completos (in-memory armazena por referencia)
  table.fields = fields;

  return table;
}

export async function makeTableWithGroup(
  repo: TableInMemoryRepository,
  groupSlug: string,
  groupFields: IField[],
  extraTableFields?: IField[],
  overrides?: TableOverrides,
): Promise<ITable> {
  const fieldGroupField = makeFieldGroupField(groupSlug);

  const groupConfig: IGroupConfiguration = {
    slug: groupSlug,
    name: `Grupo ${groupSlug}`,
    fields: groupFields,
    _schema: {},
  };

  const allTableFields = [fieldGroupField, ...(extraTableFields ?? [])];

  const table = await repo.create({
    name: overrides?.name ?? 'Tabela Com Grupo',
    slug: overrides?.slug ?? 'tabela-com-grupo',
    _schema: {},
    fields: allTableFields.map((f) => f._id),
    owner: overrides?.owner ?? 'owner-id',
    style: E_TABLE_STYLE.LIST,
    fieldOrderList: [],
    fieldOrderForm: [],
  });

  table.fields = allTableFields;
  table.groups = [groupConfig];

  return table;
}

const UPDATE_FIELD_DEFAULTS = {
  permissions: buildFieldPermissions(true, true, true),
  showInFilter: false,
  locked: false,
  allowCreateRelationshipRecords: false,
  native: false,
  required: false,
  category: [],
  dropdown: [],
  defaultValue: null,
  format: null,
  group: null,
  multiple: false,
  relationship: null,
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
};

/**
 * Campo + tabela que o aponta, o par que os onze specs de
 * `table-fields/update/fields/` montavam com a mesma funcao local.
 */
export async function makeFieldWithTable(
  fieldRepo: FieldInMemoryRepository,
  tableRepo: TableInMemoryRepository,
  options: {
    field: Merge<
      Partial<IField>,
      { name: string; slug: string; type: IField['type'] }
    >;
    table: { name: string; slug: string };
  },
): Promise<{ field: IField; table: ITable }> {
  const field = await fieldRepo.create({
    ...UPDATE_FIELD_DEFAULTS,
    ...options.field,
  });

  const table = await tableRepo.create({
    name: options.table.name,
    slug: options.table.slug,
    _schema: {},
    fields: [field._id],
    owner: 'owner-id',
    style: E_TABLE_STYLE.LIST,
    fieldOrderList: [],
    fieldOrderForm: [],
  });

  table.fields = [field];

  return { field, table };
}

/**
 * Payload completo de `TableFieldUpdateUseCase` a partir de um campo ja criado.
 * Os dez specs de `table-fields/update/fields/` montavam este mesmo objeto,
 * mudando so o slug da tabela.
 */
export function makeFieldUpdatePayload(
  tableSlug: string,
  field: IField,
  overrides: Partial<TableFieldUpdatePayload> = {},
): TableFieldUpdatePayload {
  return {
    slug: tableSlug,
    _id: field._id,
    name: field.name,
    type: field.type,
    format: field.format,
    required: field.required,
    multiple: field.multiple,
    defaultValue: field.defaultValue,
    relationship: field.relationship,
    dropdown: field.dropdown,
    category: field.category,
    group: field.group,
    trashed: false,
    trashedAt: null,
    locked: false,
    allowCreateRelationshipRecords: false,
    permissions: field.permissions,
    showInFilter: field.showInFilter,
    widthInForm: field.widthInForm,
    widthInList: field.widthInList,
    widthInDetail: field.widthInDetail,
    ...overrides,
  };
}
