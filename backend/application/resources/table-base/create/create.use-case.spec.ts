import { beforeEach, describe, expect, it } from 'vitest';

import { E_FIELD_TYPE, E_TABLE_STYLE } from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';

import TableCreateUseCase from './create.use-case';

let fieldInMemoryRepository: FieldInMemoryRepository;
let tableInMemoryRepository: TableInMemoryRepository;
let userGroupInMemoryRepository: UserGroupInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let sut: TableCreateUseCase;

describe('Table Create Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    userGroupInMemoryRepository = new UserGroupInMemoryRepository();
    schemaBuilder = new InMemorySchemaBuilder();

    sut = new TableCreateUseCase(
      tableInMemoryRepository,
      fieldInMemoryRepository,
      userGroupInMemoryRepository,
      schemaBuilder,
    );
  });

  it('deve criar tabela com sucesso', async () => {
    const result = await sut.execute({
      name: 'Clientes',
      slug: 'clientes',
      owner: 'owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.name).toBe('Clientes');
    expect(result.value.slug).toBe('clientes');

    // Deve criar 7 campos nativos + 1 campo "Nome" padrão
    const fields = result.value.fields;
    expect(fields).toHaveLength(8);

    const idField = fields.find((f) => f.slug === '_id');
    expect(idField).toBeDefined();
    if (!idField) throw new Error('Expected idField');
    expect(idField.type).toBe(E_FIELD_TYPE.IDENTIFIER);
    expect(idField.native).toBe(true);
    expect(idField.locked).toBe(true);

    const creatorField = fields.find((f) => f.slug === 'creator');
    expect(creatorField).toBeDefined();
    if (!creatorField) throw new Error('Expected creatorField');
    expect(creatorField.type).toBe(E_FIELD_TYPE.CREATOR);
    expect(creatorField.native).toBe(true);
    expect(creatorField.locked).toBe(true);

    const createdAtField = fields.find((f) => f.slug === 'createdAt');
    expect(createdAtField).toBeDefined();
    if (!createdAtField) throw new Error('Expected createdAtField');
    expect(createdAtField.type).toBe(E_FIELD_TYPE.CREATED_AT);
    expect(createdAtField.native).toBe(true);
    expect(createdAtField.locked).toBe(true);

    const updatedAtField = fields.find((f) => f.slug === 'updatedAt');
    expect(updatedAtField).toBeDefined();
    if (!updatedAtField) throw new Error('Expected updatedAtField');
    expect(updatedAtField.type).toBe(E_FIELD_TYPE.UPDATED_AT);
    expect(updatedAtField.native).toBe(true);
    expect(updatedAtField.locked).toBe(true);

    const updaterField = fields.find((f) => f.slug === 'updater');
    expect(updaterField).toBeDefined();
    if (!updaterField) throw new Error('Expected updaterField');
    expect(updaterField.type).toBe(E_FIELD_TYPE.UPDATER);
    expect(updaterField.native).toBe(true);
    expect(updaterField.locked).toBe(true);

    const statusField = fields.find((f) => f.slug === 'status');
    expect(statusField).toBeDefined();
    if (!statusField) throw new Error('Expected statusField');
    expect(statusField.type).toBe(E_FIELD_TYPE.STATUS);
    expect(statusField.native).toBe(true);
    expect(statusField.locked).toBe(true);

    const trashedAtField = fields.find((f) => f.slug === 'trashedAt');
    expect(trashedAtField).toBeDefined();
    if (!trashedAtField) throw new Error('Expected trashedAtField');
    expect(trashedAtField.type).toBe(E_FIELD_TYPE.TRASHED_AT);
    expect(trashedAtField.native).toBe(true);
    expect(trashedAtField.locked).toBe(true);

    const nomeField = fields.find((f) => f.slug === 'nome');
    expect(nomeField).toBeDefined();
    if (!nomeField) throw new Error('Expected nomeField');
    expect(nomeField.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
    expect(nomeField.native).toBe(false);
    expect(nomeField.locked).toBe(false);
    expect(nomeField.required).toBe(true);
  });

  it('deve retornar erro OWNER_REQUIRED quando owner nao for informado', async () => {
    const result = await sut.execute({
      name: 'Clientes',
      slug: 'clientes',
      owner: '',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('OWNER_REQUIRED');
    expect(result.value.message).toBe('Proprietário é obrigatório');
  });

  it('deve retornar erro TABLE_ALREADY_EXISTS quando tabela ja existir', async () => {
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
      name: 'Clientes',
      slug: 'clientes',
      owner: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('TABLE_ALREADY_EXISTS');
    expect(result.value.message).toBe('Tabela já existe');
  });

  it('deve retornar erro CREATE_TABLE_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      name: 'Clientes',
      slug: 'clientes',
      owner: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('CREATE_TABLE_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
