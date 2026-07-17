import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryModelBuilder from '@application/services/table/in-memory-model-builder.service';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';

import GroupFieldCreateUseCase from './create.use-case';

let tableRepository: TableInMemoryRepository;
let fieldRepository: FieldInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let modelBuilder: InMemoryModelBuilder;
let sut: GroupFieldCreateUseCase;

const TABLE_DEFAULTS = {
  _schema: {},
  fields: [],
  owner: 'owner-id',
  style: E_TABLE_STYLE.LIST,
  fieldOrderList: [],
  fieldOrderForm: [],
};

const FIELD_PAYLOAD_BASE = {
  type: E_FIELD_TYPE.TEXT_SHORT,
  permissions: buildFieldPermissions(true, true, true),
  showInFilter: true,
  locked: false,
  allowCreateRelationshipRecords: false,
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

describe('Group Field Create Use Case', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    fieldRepository = new FieldInMemoryRepository();
    schemaBuilder = new InMemorySchemaBuilder();
    modelBuilder = new InMemoryModelBuilder();

    sut = new GroupFieldCreateUseCase(
      tableRepository,
      fieldRepository,
      schemaBuilder,
      modelBuilder,
    );
  });

  it('deve criar campo no grupo com sucesso', async () => {
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
      name: 'Rua',
      ...FIELD_PAYLOAD_BASE,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.name).toBe('Rua');
    expect(result.value.slug).toBe('rua');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_SHORT);

    const table = await tableRepository.findBySlug('clientes');
    const group = table?.groups?.find((g) => g.slug === 'endereco');
    expect(group?.fields.some((f) => f.slug === 'rua')).toBe(true);
  });

  it('deve retornar TABLE_NOT_FOUND quando tabela nao existe', async () => {
    const result = await sut.execute({
      slug: 'inexistente',
      groupSlug: 'endereco',
      name: 'Rua',
      ...FIELD_PAYLOAD_BASE,
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
      name: 'Clientes',
      slug: 'clientes',
      groups: [],
    });

    const result = await sut.execute({
      slug: 'clientes',
      groupSlug: 'inexistente',
      name: 'Rua',
      ...FIELD_PAYLOAD_BASE,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('GROUP_NOT_FOUND');
    expect(result.value.message).toBe('Grupo não encontrado');
  });

  it('deve retornar FIELD_ALREADY_EXIST quando slug duplicado', async () => {
    const existingField = await fieldRepository.create({
      name: 'Rua',
      slug: 'rua',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
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
    });

    await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Clientes',
      slug: 'clientes',
      groups: [
        {
          slug: 'endereco',
          name: 'Endereco',
          fields: [existingField],
          _schema: {},
        },
      ],
    });

    const result = await sut.execute({
      slug: 'clientes',
      groupSlug: 'endereco',
      name: 'Rua',
      ...FIELD_PAYLOAD_BASE,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('FIELD_ALREADY_EXIST');
    expect(result.value.message).toBe('Campo já existe no grupo');
  });

  it.each([
    E_FIELD_TYPE.FIELD_GROUP,
    E_FIELD_TYPE.REACTION,
    E_FIELD_TYPE.EVALUATION,
  ])('deve rejeitar tipo %s dentro de grupo (nivel unico)', async (type) => {
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
      name: 'Aninhado',
      ...FIELD_PAYLOAD_BASE,
      type,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('FIELD_TYPE_NOT_ALLOWED_IN_GROUP');
  });

  it('deve retornar CREATE_GROUP_FIELD_ERROR quando repository falha', async () => {
    tableRepository.simulateError('findBySlug', new Error('Database error'));

    const result = await sut.execute({
      slug: 'clientes',
      groupSlug: 'endereco',
      name: 'Rua',
      ...FIELD_PAYLOAD_BASE,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('CREATE_GROUP_FIELD_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
