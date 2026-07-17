import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
} from '@application/core/entity.core';
import type { ITable } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';

import GroupRowShowUseCase from './show.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let sut: GroupRowShowUseCase;

const TABLE_DEFAULTS = {
  _schema: {},
  owner: 'owner-id',
  style: E_TABLE_STYLE.LIST,
  fieldOrderList: [],
  fieldOrderForm: [],
};

const GROUP_FIELD = {
  _id: 'field-group-1',
  name: 'Items',
  slug: 'items',
  type: E_FIELD_TYPE.FIELD_GROUP,
  required: false,
  multiple: false,
  format: E_FIELD_FORMAT.ALPHA_NUMERIC,
  showInFilter: false,
  permissions: buildFieldPermissions(false, true, true),
  widthInForm: 100,
  widthInList: null,
  widthInDetail: null,
  defaultValue: null,
  locked: false,
  native: false,
  relationship: null,
  dropdown: [],
  category: [],
  group: { slug: 'items' },
  createdAt: new Date(),
  updatedAt: new Date(),
  trashed: false,
  trashedAt: null,
};

const GROUP_CONFIG = {
  slug: 'items',
  name: 'Items',
  fields: [
    {
      _id: 'gf-1',
      name: 'Descricao',
      slug: 'descricao',
      type: E_FIELD_TYPE.TEXT_SHORT,
      required: false,
      multiple: false,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      showInFilter: false,
      permissions: buildFieldPermissions(true, true, true),
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      defaultValue: null,
      locked: false,
      native: false,
      relationship: null,
      dropdown: [],
      category: [],
      group: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      trashed: false,
      trashedAt: null,
    },
  ],
  _schema: {},
};

async function createTableWithGroup(): Promise<ITable> {
  const table = await tableRepository.create({
    ...TABLE_DEFAULTS,
    name: 'Pedidos',
    slug: 'pedidos',
    fields: [GROUP_FIELD._id],
    groups: [GROUP_CONFIG],
  });
  table.fields = [GROUP_FIELD];
  return table;
}

async function createRowWithItems(table: ITable): Promise<{
  rowId: string;
  itemId: string;
}> {
  const row = await rowRepository.create({
    table,
    data: {
      items: [
        { _id: 'item-1', descricao: 'Item A' },
        { _id: 'item-2', descricao: 'Item B' },
      ],
    },
  });
  return { rowId: row._id, itemId: 'item-1' };
}

describe('Group Row Show Use Case', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    sut = new GroupRowShowUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
    );
  });

  it('deve retornar item especifico do grupo', async () => {
    const table = await createTableWithGroup();
    const { rowId, itemId } = await createRowWithItems(table);

    const result = await sut.execute({
      slug: 'pedidos',
      rowId,
      groupSlug: 'items',
      itemId,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value).toHaveProperty('_id', 'item-1');
    expect(result.value).toHaveProperty('descricao', 'Item A');
  });

  it('deve retornar TABLE_NOT_FOUND quando tabela nao existe', async () => {
    const result = await sut.execute({
      slug: 'inexistente',
      rowId: 'row-1',
      groupSlug: 'items',
      itemId: 'item-1',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    expect(result.value.message).toBe('Tabela não encontrada');
  });

  it('deve retornar ROW_NOT_FOUND quando row nao existe', async () => {
    await createTableWithGroup();

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: 'row-inexistente',
      groupSlug: 'items',
      itemId: 'item-1',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('ROW_NOT_FOUND');
    expect(result.value.message).toBe('Registro não encontrado');
  });

  it('deve retornar ITEM_NOT_FOUND quando item nao existe', async () => {
    const table = await createTableWithGroup();
    const { rowId } = await createRowWithItems(table);

    const result = await sut.execute({
      slug: 'pedidos',
      rowId,
      groupSlug: 'items',
      itemId: 'item-inexistente',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('ITEM_NOT_FOUND');
    expect(result.value.message).toBe('Item não encontrado');
  });
});
