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

import TableFieldRemoveFromTrashUseCase from './remove-from-trash.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let sut: TableFieldRemoveFromTrashUseCase;

describe('Table Field Remove From Trash Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    schemaBuilder = new InMemorySchemaBuilder();

    sut = new TableFieldRemoveFromTrashUseCase(
      tableInMemoryRepository,
      fieldInMemoryRepository,
      schemaBuilder,
    );
  });

  it('deve remover campo da lixeira com sucesso', async () => {
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

    const result = await sut.execute({
      slug: 'clientes',
      _id: field._id,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.trashed).toBe(false);
    expect(result.value.trashedAt).toBeNull();
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
    expect(result.value.message).toBe('Tabela não encontrada');
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
    expect(result.value.message).toBe('Campo não encontrado');
  });

  it('deve retornar erro NOT_TRASHED quando campo nao estiver na lixeira', async () => {
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

    const result = await sut.execute({
      slug: 'clientes',
      _id: field._id,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('NOT_TRASHED');
    expect(result.value.message).toBe('Campo não está na lixeira');
  });

  it('deve retornar erro REMOVE_FIELD_FROM_TRASH_ERROR quando houver falha', async () => {
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
    expect(result.value.cause).toBe('REMOVE_FIELD_FROM_TRASH_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
