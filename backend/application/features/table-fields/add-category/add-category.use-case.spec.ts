import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import TableFieldAddCategoryUseCase from './add-category.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let sut: TableFieldAddCategoryUseCase;

describe('Table Field Add Category Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    sut = new TableFieldAddCategoryUseCase(
      tableInMemoryRepository,
      fieldInMemoryRepository,
    );
  });

  it('deve adicionar categoria na raiz com sucesso', async () => {
    const field = await fieldInMemoryRepository.create({
      name: 'Categorias',
      slug: 'categorias',
      type: E_FIELD_TYPE.CATEGORY,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      required: false,
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

    await tableInMemoryRepository.create({
      name: 'Produtos',
      slug: 'produtos',
      _schema: {},
      fields: [field._id],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      slug: 'produtos',
      _id: field._id,
      label: 'Eletronicos',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.node.label).toBe('Eletronicos');
    expect(result.value.node.parentId).toBeNull();
    expect(result.value.node.id).toBeTruthy();
    expect(result.value.field).toBeTruthy();
  });

  it('deve adicionar subcategoria com parentId com sucesso', async () => {
    const field = await fieldInMemoryRepository.create({
      name: 'Categorias',
      slug: 'categorias',
      type: E_FIELD_TYPE.CATEGORY,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      required: false,
      dropdown: [],
      category: [{ id: 'parent-uuid', label: 'Eletronicos', children: [] }],
      defaultValue: null,
      format: null,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    await tableInMemoryRepository.create({
      name: 'Produtos',
      slug: 'produtos',
      _schema: {},
      fields: [field._id],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      slug: 'produtos',
      _id: field._id,
      label: 'Smartphones',
      parentId: 'parent-uuid',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.node.label).toBe('Smartphones');
    expect(result.value.node.parentId).toBe('parent-uuid');
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      _id: 'field-id',
      label: 'Categoria',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
  });

  it('deve retornar erro FIELD_NOT_FOUND quando campo nao existir', async () => {
    await tableInMemoryRepository.create({
      name: 'Produtos',
      slug: 'produtos',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      slug: 'produtos',
      _id: 'non-existent-field',
      label: 'Categoria',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('FIELD_NOT_FOUND');
  });

  it('deve retornar erro FIELD_NOT_FOUND quando campo nao pertence a tabela', async () => {
    const field = await fieldInMemoryRepository.create({
      name: 'Categorias',
      slug: 'categorias',
      type: E_FIELD_TYPE.CATEGORY,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      required: false,
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

    await tableInMemoryRepository.create({
      name: 'Produtos',
      slug: 'produtos',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      slug: 'produtos',
      _id: field._id,
      label: 'Categoria',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('FIELD_NOT_FOUND');
  });

  it('deve retornar erro INVALID_FIELD_TYPE quando campo nao e do tipo CATEGORY', async () => {
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
      name: 'Produtos',
      slug: 'produtos',
      _schema: {},
      fields: [field._id],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      slug: 'produtos',
      _id: field._id,
      label: 'Categoria',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('INVALID_FIELD_TYPE');
  });

  it('deve retornar erro PARENT_CATEGORY_NOT_FOUND quando parentId nao existe na arvore', async () => {
    const field = await fieldInMemoryRepository.create({
      name: 'Categorias',
      slug: 'categorias',
      type: E_FIELD_TYPE.CATEGORY,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      required: false,
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

    await tableInMemoryRepository.create({
      name: 'Produtos',
      slug: 'produtos',
      _schema: {},
      fields: [field._id],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      slug: 'produtos',
      _id: field._id,
      label: 'Smartphones',
      parentId: 'non-existent-parent',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('PARENT_CATEGORY_NOT_FOUND');
  });

  it('deve retornar erro ADD_CATEGORY_OPTION_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      _id: 'field-id',
      label: 'Categoria',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('ADD_CATEGORY_OPTION_ERROR');
  });
});
