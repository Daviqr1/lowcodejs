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

import GroupFieldSendToTrashUseCase from './send-to-trash.use-case';

let tableRepository: TableInMemoryRepository;
let fieldRepository: FieldInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let sut: GroupFieldSendToTrashUseCase;

const TABLE_DEFAULTS = {
  _schema: {},
  fields: [],
  owner: 'owner-id',
  style: E_TABLE_STYLE.LIST,
  fieldOrderList: [],
  fieldOrderForm: [],
};

const FIELD_CREATE_PAYLOAD = {
  name: 'Rua',
  slug: 'rua',
  type: E_FIELD_TYPE.TEXT_SHORT,
  permissions: buildFieldPermissions(true, true, true),
  showInFilter: true,
  locked: false,
  native: false,
  required: false,
  category: [],
  dropdown: [],
  defaultValue: null,
  format: E_FIELD_FORMAT.ALPHA_NUMERIC,
  group: null,
  multiple: false,
  relationship: null,
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
};

describe('Group Field Send To Trash Use Case', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    fieldRepository = new FieldInMemoryRepository();
    schemaBuilder = new InMemorySchemaBuilder();

    sut = new GroupFieldSendToTrashUseCase(
      tableRepository,
      fieldRepository,
      schemaBuilder,
    );
  });

  it('deve enviar campo para lixeira', async () => {
    const field = await fieldRepository.create(FIELD_CREATE_PAYLOAD);

    await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Clientes',
      slug: 'clientes',
      groups: [
        {
          slug: 'endereco',
          name: 'Endereco',
          fields: [field],
          _schema: {},
        },
      ],
    });

    const result = await sut.execute({
      slug: 'clientes',
      groupSlug: 'endereco',
      fieldId: field._id,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.trashed).toBe(true);
    expect(result.value.permissions?.list.kind).toBe('NOBODY');
    expect(result.value.permissions?.form.kind).toBe('NOBODY');
    expect(result.value.permissions?.detail.kind).toBe('NOBODY');
    expect(result.value.showInFilter).toBe(false);
    expect(result.value.required).toBe(false);
  });

  it('deve retornar TABLE_NOT_FOUND quando tabela nao existe', async () => {
    const result = await sut.execute({
      slug: 'inexistente',
      groupSlug: 'endereco',
      fieldId: 'field-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    expect(result.value.message).toBe('Tabela não encontrada');
  });

  it('deve retornar FIELD_NOT_FOUND quando campo nao existe', async () => {
    await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Clientes',
      slug: 'clientes',
      groups: [
        {
          slug: 'endereco',
          name: 'Endereco',
          fields: [],
          _schema: {},
        },
      ],
    });

    const result = await sut.execute({
      slug: 'clientes',
      groupSlug: 'endereco',
      fieldId: 'campo-inexistente',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('FIELD_NOT_FOUND');
    expect(result.value.message).toBe('Campo não encontrado');
  });

  it('deve retornar ALREADY_TRASHED quando campo ja esta na lixeira', async () => {
    const field = await fieldRepository.create(FIELD_CREATE_PAYLOAD);

    // Marca o campo como trashed
    await fieldRepository.update({
      _id: field._id,
      trashed: true,
      trashedAt: new Date(),
    });

    await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Clientes',
      slug: 'clientes',
      groups: [
        {
          slug: 'endereco',
          name: 'Endereco',
          fields: [field],
          _schema: {},
        },
      ],
    });

    const result = await sut.execute({
      slug: 'clientes',
      groupSlug: 'endereco',
      fieldId: field._id,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('ALREADY_TRASHED');
    expect(result.value.message).toBe('Campo já está na lixeira');
  });

  it('deve retornar NATIVE_FIELD_CANNOT_BE_TRASHED para campo nativo', async () => {
    const field = await fieldRepository.create({
      ...FIELD_CREATE_PAYLOAD,
      native: true,
    });

    await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Clientes',
      slug: 'clientes',
      groups: [
        {
          slug: 'endereco',
          name: 'Endereco',
          fields: [field],
          _schema: {},
        },
      ],
    });

    const result = await sut.execute({
      slug: 'clientes',
      groupSlug: 'endereco',
      fieldId: field._id,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(403);
    expect(result.value.cause).toBe('NATIVE_FIELD_CANNOT_BE_TRASHED');
    expect(result.value.message).toBe(
      'Campos nativos não podem ser enviados para a lixeira',
    );
  });
});
