import { beforeEach, describe, expect, it } from 'vitest';

import {
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  buildFieldPermissions,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RelationshipDefinitionInMemoryRepository from '@application/repositories/relationship-definition/relationship-definition-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import RelationshipMaterializationService from '@application/services/relationship/relationship-materialization.service';
import InMemoryModelBuilder from '@application/services/table/in-memory-model-builder.service';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';

import TableFieldCreateUseCase from './create.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let modelBuilder: InMemoryModelBuilder;
let sut: TableFieldCreateUseCase;

describe('Table Field Create Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    schemaBuilder = new InMemorySchemaBuilder();
    modelBuilder = new InMemoryModelBuilder();

    sut = new TableFieldCreateUseCase(
      tableInMemoryRepository,
      fieldInMemoryRepository,
      schemaBuilder,
      modelBuilder,
      new RelationshipMaterializationService(
        fieldInMemoryRepository,
        tableInMemoryRepository,
        new RelationshipDefinitionInMemoryRepository(),
        schemaBuilder,
        modelBuilder,
      ),
    );
  });

  it('deve criar campo com sucesso', async () => {
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
      name: 'Nome',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: true,
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

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.name).toBe('Nome');
    expect(result.value.slug).toBe('nome');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      name: 'Nome',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: true,
      category: [],
      dropdown: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    expect(result.value.message).toBe('Tabela não encontrada');
  });

  it('deve retornar erro FIELD_ALREADY_EXIST quando campo ja existir', async () => {
    const field = await fieldInMemoryRepository.create({
      name: 'Nome',
      slug: 'nome',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      native: false,
      required: true,
      category: [],
      dropdown: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    const table = await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [field._id],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });
    table.fields = [field];

    const result = await sut.execute({
      slug: 'clientes',
      name: 'Nome',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: true,
      category: [],
      dropdown: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('FIELD_ALREADY_EXIST');
    expect(result.value.message).toBe('Campo já existe');
  });

  it('deve retornar erro CREATE_FIELD_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      name: 'Nome',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: true,
      category: [],
      dropdown: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('CREATE_FIELD_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
