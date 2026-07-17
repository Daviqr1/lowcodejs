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

import GroupRowCreateUseCase from './create.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let sut: GroupRowCreateUseCase;

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

async function createRowWithItems(table: ITable): Promise<string> {
  const row = await rowRepository.create({
    table,
    data: {
      items: [{ _id: 'item-1', descricao: 'Item existente' }],
    },
  });
  return row._id;
}

describe('Group Row Create Use Case', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    sut = new GroupRowCreateUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
    );
  });

  it('deve criar item no grupo com sucesso', async () => {
    const table = await createTableWithGroup();
    const rowId = await createRowWithItems(table);

    const result = await sut.execute({
      slug: 'pedidos',
      rowId,
      groupSlug: 'items',
      descricao: 'Novo item',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const value = result.value;
    expect(value).toHaveProperty('_id');
    expect(value).toHaveProperty('descricao', 'Novo item');
  });

  it('deve retornar TABLE_NOT_FOUND quando tabela nao existe', async () => {
    const result = await sut.execute({
      slug: 'inexistente',
      rowId: 'row-1',
      groupSlug: 'items',
      descricao: 'Novo item',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    expect(result.value.message).toBe('Tabela não encontrada');
  });

  it('deve retornar GROUP_NOT_FOUND quando grupo nao existe', async () => {
    await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Pedidos',
      slug: 'pedidos',
      fields: [],
      groups: [],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: 'row-1',
      groupSlug: 'inexistente',
      descricao: 'Novo item',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('GROUP_NOT_FOUND');
    expect(result.value.message).toBe('Grupo não encontrado');
  });

  it('deve retornar ROW_NOT_FOUND quando row nao existe', async () => {
    await createTableWithGroup();

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: 'row-inexistente',
      groupSlug: 'items',
      descricao: 'Novo item',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('CREATE_GROUP_ROW_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });

  it('deve retornar CREATE_GROUP_ROW_ERROR quando repository falha', async () => {
    tableRepository.simulateError('findBySlug', new Error('Database error'));

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: 'row-1',
      groupSlug: 'items',
      descricao: 'Novo item',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('CREATE_GROUP_ROW_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
