import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';

import TableFieldDeleteUseCase from './delete.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let sut: TableFieldDeleteUseCase;

describe('Table Field Delete Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    schemaBuilder = new InMemorySchemaBuilder();

    sut = new TableFieldDeleteUseCase(
      tableInMemoryRepository,
      fieldInMemoryRepository,
      schemaBuilder,
    );
  });

  it('deve deletar campo permanentemente com sucesso', async () => {
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

    await fieldInMemoryRepository.update({
      _id: field._id,
      trashed: true,
      trashedAt: new Date(),
    });

    await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [field._id],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({ slug: 'clientes', _id: field._id });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value).toBeNull();

    const foundField = await fieldInMemoryRepository.findById(field._id);
    expect(foundField).toBeNull();
    const updatedTable = await tableInMemoryRepository.findBySlug('clientes');
    expect(updatedTable?.fields).not.toContain(field._id);
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      _id: 'field-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
  });

  it('deve retornar erro FIELD_NOT_FOUND quando campo nao existir', async () => {
    await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      slug: 'clientes',
      _id: 'non-existent-field',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('FIELD_NOT_FOUND');
  });

  it('deve retornar erro FIELD_NOT_TRASHED quando campo nao esta na lixeira', async () => {
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
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [field._id],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({ slug: 'clientes', _id: field._id });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('FIELD_NOT_TRASHED');
  });

  it('deve retornar erro NATIVE_FIELD_CANNOT_BE_DELETED quando campo e nativo', async () => {
    const field = await fieldInMemoryRepository.create({
      name: 'ID',
      slug: '_id',
      type: E_FIELD_TYPE.IDENTIFIER,
      permissions: buildFieldPermissions(true, false, true),
      showInFilter: false,
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
      native: true,
    });

    await fieldInMemoryRepository.update({
      _id: field._id,
      trashed: true,
      trashedAt: new Date(),
    });

    await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [field._id],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({ slug: 'clientes', _id: field._id });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(403);
    expect(result.value.cause).toBe('NATIVE_FIELD_CANNOT_BE_DELETED');
  });

  it('deve retornar erro FIELD_LOCKED quando campo esta bloqueado', async () => {
    const field = await fieldInMemoryRepository.create({
      name: 'Status',
      slug: 'status',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      required: false,
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
      locked: true,
    });

    await fieldInMemoryRepository.update({
      _id: field._id,
      trashed: true,
      trashedAt: new Date(),
    });

    await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [field._id],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({ slug: 'clientes', _id: field._id });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(403);
    expect(result.value.cause).toBe('FIELD_LOCKED');
  });

  it('deve retornar erro DELETE_FIELD_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      _id: 'field-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('DELETE_FIELD_ERROR');
  });
});
