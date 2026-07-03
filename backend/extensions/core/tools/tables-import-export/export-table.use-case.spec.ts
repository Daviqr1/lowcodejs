import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_MENU_ITEM_TYPE,
  E_TABLE_STYLE,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import ExportTableUseCase from './export-table.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let menuInMemoryRepository: MenuInMemoryRepository;
let sut: ExportTableUseCase;

const tableBase = {
  _schema: {},
  owner: 'owner-id',
  style: E_TABLE_STYLE.LIST,
  fieldOrderList: [],
  fieldOrderForm: [],
};

describe('Export Table Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    rowInMemoryRepository = new RowInMemoryRepository();
    menuInMemoryRepository = new MenuInMemoryRepository();
    sut = new ExportTableUseCase(
      tableInMemoryRepository,
      rowInMemoryRepository,
      menuInMemoryRepository,
    );
  });

  it('deve exportar estrutura da tabela com sucesso', async () => {
    const field = await fieldInMemoryRepository.create({
      name: 'Nome',
      slug: 'nome',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      required: true,
      dropdown: [],
      category: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    await tableInMemoryRepository.create({
      ...tableBase,
      name: 'Clientes',
      slug: 'clientes',
      fields: [field._id],
    });

    const result = await sut.execute({
      slugs: ['clientes'],
      exportType: 'structure',
      acknowledgeMissingRelationships: false,
      userId: 'user-id',
      userName: 'Admin',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.header.platform).toBe('lowcodejs');
    expect(result.value.header.version).toBe('2.0');
    expect(result.value.header.tableName).toBe('Clientes');
    expect(result.value.header.tableSlug).toBe('clientes');
    expect(result.value.header.tablesCount).toBe(1);
    expect(result.value.tables).toHaveLength(1);
    expect(result.value.tables[0].structure).toBeTruthy();
    expect(result.value.tables[0].data).toBeUndefined();
  });

  it('deve exportar dados da tabela com sucesso', async () => {
    await tableInMemoryRepository.create({
      ...tableBase,
      name: 'Clientes',
      slug: 'clientes',
      fields: [],
    });

    const result = await sut.execute({
      slug: 'clientes',
      exportType: 'data',
      acknowledgeMissingRelationships: false,
      userId: 'user-id',
      userName: 'Admin',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.header.exportType).toBe('data');
    expect(result.value.tables[0].structure).toBeUndefined();
    expect(result.value.tables[0].data).toBeTruthy();
  });

  it('deve exportar campos USER e o criador (CREATOR) da row', async () => {
    const userField = await fieldInMemoryRepository.create({
      name: 'Adaptado por',
      slug: 'adaptado-por',
      type: E_FIELD_TYPE.USER,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: false,
      required: false,
      dropdown: [],
      category: [],
      defaultValue: null,
      format: null,
      group: null,
      multiple: true,
      relationship: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    const table = await tableInMemoryRepository.create({
      ...tableBase,
      name: 'Livros',
      slug: 'livros',
      fields: [userField._id],
    });
    table.fields = [userField];

    await rowInMemoryRepository.create({
      table,
      data: {
        'adaptado-por': ['user-1', 'user-2'],
        creator: 'user-9',
      },
    });

    const result = await sut.execute({
      slugs: ['livros'],
      exportType: 'data',
      acknowledgeMissingRelationships: false,
      userId: 'user-id',
      userName: 'Admin',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    const row = result.value.tables[0].data?.rows[0];
    expect(row?.['adaptado-por']).toEqual(['user-1', 'user-2']);
    expect(row?._originalCreator).toBe('user-9');
  });

  it('deve exportar full (estrutura + dados) com sucesso', async () => {
    await tableInMemoryRepository.create({
      ...tableBase,
      name: 'Clientes',
      slug: 'clientes',
      fields: [],
    });

    const result = await sut.execute({
      slugs: ['clientes'],
      exportType: 'full',
      acknowledgeMissingRelationships: false,
      userId: 'user-id',
      userName: 'Admin',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.header.exportType).toBe('full');
    expect(result.value.tables[0].structure).toBeTruthy();
    expect(result.value.tables[0].data).toBeTruthy();
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slugs: ['non-existent'],
      exportType: 'structure',
      acknowledgeMissingRelationships: false,
      userId: 'user-id',
      userName: 'Admin',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
  });

  it('deve retornar MISSING_RELATED_TABLES quando relationship aponta para tabela fora da seleção', async () => {
    const relField = await fieldInMemoryRepository.create({
      name: 'Cliente',
      slug: 'cliente',
      type: E_FIELD_TYPE.RELATIONSHIP,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: false,
      required: false,
      dropdown: [],
      category: [],
      defaultValue: null,
      format: null,
      group: null,
      multiple: false,
      relationship: {
        table: { _id: 'tbl-clientes', slug: 'clientes' },
        field: { _id: 'fld-nome', slug: 'nome' },
        order: 'asc',
      },
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    const pedidos = await tableInMemoryRepository.create({
      ...tableBase,
      name: 'Pedidos',
      slug: 'pedidos',
      fields: [relField._id],
    });
    pedidos.fields = [relField];

    const result = await sut.execute({
      slugs: ['pedidos'],
      exportType: 'structure',
      acknowledgeMissingRelationships: false,
      userId: 'user-id',
      userName: 'Admin',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('MISSING_RELATED_TABLES');
    expect(result.value.errors?.missingTables).toContain('clientes');
  });

  it('deve incluir menu vinculado e ancestrais', async () => {
    const table = await tableInMemoryRepository.create({
      ...tableBase,
      name: 'Clientes',
      slug: 'clientes',
      fields: [],
    });

    const root = await menuInMemoryRepository.create({
      name: 'Cadastros',
      slug: 'cadastros',
      type: E_MENU_ITEM_TYPE.SEPARATOR,
    });

    await menuInMemoryRepository.create({
      name: 'Clientes',
      slug: 'menu-clientes',
      type: E_MENU_ITEM_TYPE.TABLE,
      table: table._id,
      parent: root._id,
    });

    const result = await sut.execute({
      slugs: ['clientes'],
      exportType: 'structure',
      acknowledgeMissingRelationships: false,
      userId: 'user-id',
      userName: 'Admin',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.menus).toHaveLength(2);
    const leaf = result.value.menus.find((m) => m.slug === 'menu-clientes');
    expect(leaf?.tableSlug).toBe('clientes');
    expect(leaf?.parent).toBe(root._id);
    const parent = result.value.menus.find((m) => m.slug === 'cadastros');
    expect(parent).toBeTruthy();
  });

  it('deve serializar relationships com ObjectId sem estourar a pilha', async () => {
    // Reproduz o comportamento do ObjectId do Mongoose: o getter `_id`
    // retorna a si mesmo, o que causava recursão infinita em toIdString.
    const makeObjectId = (hex: string): object => {
      const oid: Record<string, unknown> = {
        _bsontype: 'ObjectId',
        toString: () => hex,
      };
      Object.defineProperty(oid, '_id', { get: () => oid });
      return oid;
    };

    const relField = await fieldInMemoryRepository.create({
      name: 'Cliente',
      slug: 'cliente',
      type: E_FIELD_TYPE.RELATIONSHIP,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: false,
      required: false,
      dropdown: [],
      category: [],
      defaultValue: null,
      format: null,
      group: null,
      multiple: true,
      relationship: {
        table: { _id: 'tbl-clientes', slug: 'clientes' },
        field: { _id: 'fld-nome', slug: 'nome' },
        order: 'asc',
      },
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    const table = await tableInMemoryRepository.create({
      ...tableBase,
      name: 'Pedidos',
      slug: 'pedidos',
      fields: [relField._id],
    });
    table.fields = [relField];

    await rowInMemoryRepository.create({
      table,
      data: {
        cliente: [
          makeObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
          makeObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
        ],
      },
    });

    const result = await sut.execute({
      slugs: ['pedidos'],
      exportType: 'data',
      acknowledgeMissingRelationships: true,
      userId: 'user-id',
      userName: 'Admin',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.tables[0].data?.rows[0].cliente).toEqual([
      'aaaaaaaaaaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
    ]);
  });

  it('deve retornar erro EXPORT_TABLE_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slugs: ['some-slug'],
      exportType: 'structure',
      acknowledgeMissingRelationships: false,
      userId: 'user-id',
      userName: 'Admin',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('EXPORT_TABLE_ERROR');
  });
});
