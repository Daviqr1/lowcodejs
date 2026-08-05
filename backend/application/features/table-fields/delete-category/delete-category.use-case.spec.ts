import { beforeEach, describe, expect, it } from 'vitest';

import type { ICategory, IField, ITable } from '@application/core/entity.core';
import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import type { RowTableContext } from '@application/repositories/row/row-contract.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import TableFieldDeleteCategoryUseCase from './delete-category.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let sut: TableFieldDeleteCategoryUseCase;

const TREE: Array<ICategory> = [
  {
    id: 'a',
    label: 'A',
    children: [{ id: 'a1', label: 'A1', children: [] }],
  },
  { id: 'b', label: 'B', children: [] },
];

async function makeCategoryField(category: Array<ICategory>): Promise<IField> {
  return fieldInMemoryRepository.create({
    name: 'Categorias',
    slug: 'categorias',
    type: E_FIELD_TYPE.CATEGORY,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    required: false,
    dropdown: [],
    category,
    defaultValue: null,
    format: null,
    group: null,
    multiple: false,
    relationship: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });
}

async function makeTable(fields: Array<string>): Promise<ITable> {
  return tableInMemoryRepository.create({
    name: 'Produtos',
    slug: 'produtos',
    _schema: {},
    fields,
    owner: 'owner-id',
    style: E_TABLE_STYLE.DOCUMENT,
    fieldOrderList: [],
    fieldOrderForm: [],
  });
}

describe('Table Field Delete Category Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    rowInMemoryRepository = new RowInMemoryRepository();
    sut = new TableFieldDeleteCategoryUseCase(
      tableInMemoryRepository,
      fieldInMemoryRepository,
      rowInMemoryRepository,
    );
  });

  it('deve remover o no e seus descendentes da arvore', async () => {
    const field = await makeCategoryField(TREE);
    await makeTable([field._id]);

    const result = await sut.execute({
      slug: 'produtos',
      _id: field._id,
      categoryId: 'a',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.removedIds.sort()).toEqual(['a', 'a1']);

    const remaining = result.value.field.category;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('b');
  });

  it('deve desvincular os registros vinculados ao no removido', async () => {
    const field = await makeCategoryField(TREE);
    const table = await makeTable([field._id]);

    const context: RowTableContext = { ...table, fields: [field] };

    await rowInMemoryRepository.create({
      table: context,
      data: { categorias: ['a1'] },
    });
    await rowInMemoryRepository.create({
      table: context,
      data: { categorias: ['b'] },
    });

    const result = await sut.execute({
      slug: 'produtos',
      _id: field._id,
      categoryId: 'a',
    });

    expect(result.isRight()).toBe(true);

    const rows = await rowInMemoryRepository.findMany({
      table: context,
      skip: 0,
      limit: 10,
    });

    const linkedToRemoved = rows.find(
      (row) => Array.isArray(row.categorias) && row.categorias.includes('a1'),
    );
    expect(linkedToRemoved).toBeUndefined();

    const untouched = rows.find(
      (row) => Array.isArray(row.categorias) && row.categorias.includes('b'),
    );
    expect(untouched).toBeTruthy();
  });

  it('deve remover subcategoria aninhada mantendo o pai', async () => {
    const field = await makeCategoryField(TREE);
    await makeTable([field._id]);

    const result = await sut.execute({
      slug: 'produtos',
      _id: field._id,
      categoryId: 'a1',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.removedIds).toEqual(['a1']);
    const tree = result.value.field.category;
    const parent = tree.find((node) => node.id === 'a');
    expect(parent?.children).toHaveLength(0);
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      _id: 'field-id',
      categoryId: 'a',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
  });

  it('deve retornar erro FIELD_NOT_FOUND quando campo nao existir', async () => {
    await makeTable([]);

    const result = await sut.execute({
      slug: 'produtos',
      _id: 'non-existent-field',
      categoryId: 'a',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('FIELD_NOT_FOUND');
  });

  it('deve retornar erro INVALID_FIELD_TYPE quando campo nao e CATEGORY', async () => {
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
      format: null,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });
    await makeTable([field._id]);

    const result = await sut.execute({
      slug: 'produtos',
      _id: field._id,
      categoryId: 'a',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('INVALID_FIELD_TYPE');
  });

  it('deve retornar erro CATEGORY_NOT_FOUND quando o no nao existir na arvore', async () => {
    const field = await makeCategoryField(TREE);
    await makeTable([field._id]);

    const result = await sut.execute({
      slug: 'produtos',
      _id: field._id,
      categoryId: 'non-existent',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('CATEGORY_NOT_FOUND');
  });

  it('deve retornar erro DELETE_CATEGORY_OPTION_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      _id: 'field-id',
      categoryId: 'a',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('DELETE_CATEGORY_OPTION_ERROR');
  });
});
