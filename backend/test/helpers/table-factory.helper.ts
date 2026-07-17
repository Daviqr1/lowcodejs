import {
  E_TABLE_STYLE,
  type IField,
  type IGroupConfiguration,
  type ITable,
  type Merge,
} from '@application/core/entity.core';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

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
