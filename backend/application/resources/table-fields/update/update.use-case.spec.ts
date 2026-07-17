import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RelationshipDefinitionInMemoryRepository from '@application/repositories/relationship-definition/relationship-definition-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import RelationshipMaterializationService from '@application/services/relationship/relationship-materialization.service';
import InMemoryModelBuilder from '@application/services/table/in-memory-model-builder.service';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';

import TableFieldUpdateUseCase from './update.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let modelBuilder: InMemoryModelBuilder;
let sut: TableFieldUpdateUseCase;

describe('Table Field Update Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    rowInMemoryRepository = new RowInMemoryRepository();

    schemaBuilder = new InMemorySchemaBuilder();
    modelBuilder = new InMemoryModelBuilder();

    sut = new TableFieldUpdateUseCase(
      tableInMemoryRepository,
      fieldInMemoryRepository,
      rowInMemoryRepository,
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

  it('deve atualizar campo com sucesso', async () => {
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
      name: 'Nome Atualizado',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: false,
      dropdown: [],
      category: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      trashed: false,
      trashedAt: null,
      widthInForm: 75,
      widthInList: 30,
      widthInDetail: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.name).toBe('Nome Atualizado');
    expect(result.value.required).toBe(false);
    expect(result.value.widthInForm).toBe(75);
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      _id: 'field-id',
      name: 'Nome',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: false,
      dropdown: [],
      category: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      trashed: false,
      trashedAt: null,
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

  it('deve rejeitar RELATIONSHIP dentro de grupo (RELATIONSHIP_IN_FIELD_GROUP)', async () => {
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
      _id: 'field-id',
      name: 'Pedidos',
      type: E_FIELD_TYPE.RELATIONSHIP,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: false,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: false,
      dropdown: [],
      category: [],
      defaultValue: null,
      format: null,
      group: 'algum-grupo',
      multiple: true,
      relationship: null,
      trashed: false,
      trashedAt: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('RELATIONSHIP_IN_FIELD_GROUP');
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
      name: 'Nome',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: false,
      dropdown: [],
      category: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      trashed: false,
      trashedAt: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('FIELD_NOT_FOUND');
    expect(result.value.message).toBe('Campo não encontrado');
  });

  it('deve retornar erro LAST_ACTIVE_FIELD quando tentar enviar unico campo para lixeira', async () => {
    const field = await fieldInMemoryRepository.create({
      name: 'Nome',
      slug: 'nome',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      native: false,
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
      name: 'Nome',
      type: E_FIELD_TYPE.TEXT_SHORT,
      trashed: true,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: false,
      dropdown: [],
      category: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      trashedAt: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('LAST_ACTIVE_FIELD');
    expect(result.value.message).toBe(
      'Último campo ativo, não pode ser enviado para a lixeira',
    );
  });

  it('deve retornar erro UPDATE_FIELD_TABLE_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      _id: 'field-id',
      name: 'Nome',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: false,
      dropdown: [],
      category: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      trashed: false,
      trashedAt: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('UPDATE_FIELD_TABLE_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });

  it('deve aplicar label customizado em campo nativo preservando name e slug originais', async () => {
    const field = await fieldInMemoryRepository.create({
      name: 'Criado em',
      slug: 'createdAt',
      type: E_FIELD_TYPE.CREATED_AT,
      permissions: buildFieldPermissions(true, false, true),
      showInFilter: true,
      locked: true,
      allowCreateRelationshipRecords: false,
      native: true,
      required: false,
      category: [],
      dropdown: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: null,
      widthInList: 10,
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
      // Tentativa de mudar name/type/slug deve ser ignorada em campo nativo.
      name: 'Tentativa de renomear',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, false, true),
      showInFilter: true,
      locked: true,
      allowCreateRelationshipRecords: false,
      required: false,
      dropdown: [],
      category: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS,
      group: null,
      multiple: false,
      relationship: null,
      trashed: false,
      trashedAt: null,
      widthInForm: null,
      widthInList: 10,
      widthInDetail: null,
      label: { list: 'Data de início', filter: null, form: null, detail: null },
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    // label customizado salvo; name e slug originais preservados.
    expect(result.value.label).toEqual({
      list: 'Data de início',
      filter: null,
      form: null,
      detail: null,
    });
    expect(result.value.name).toBe('Criado em');
    expect(result.value.slug).toBe('createdAt');
    expect(result.value.type).toBe(E_FIELD_TYPE.CREATED_AT);
  });

  it('deve limpar label (volta ao name) quando enviado vazio', async () => {
    const field = await fieldInMemoryRepository.create({
      name: 'Criado em',
      slug: 'createdAt',
      type: E_FIELD_TYPE.CREATED_AT,
      permissions: buildFieldPermissions(true, false, true),
      showInFilter: true,
      locked: true,
      allowCreateRelationshipRecords: false,
      native: true,
      label: { list: 'Data de início', filter: null, form: null, detail: null },
      required: false,
      category: [],
      dropdown: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: null,
      widthInList: 10,
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
      name: 'Criado em',
      type: E_FIELD_TYPE.CREATED_AT,
      permissions: buildFieldPermissions(true, false, true),
      showInFilter: true,
      locked: true,
      allowCreateRelationshipRecords: false,
      required: false,
      dropdown: [],
      category: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS,
      group: null,
      multiple: false,
      relationship: null,
      trashed: false,
      trashedAt: null,
      widthInForm: null,
      widthInList: 10,
      widthInDetail: null,
      label: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.label).toBeNull();
    expect(result.value.name).toBe('Criado em');
  });
});
