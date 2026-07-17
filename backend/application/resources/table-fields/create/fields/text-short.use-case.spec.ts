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

import TableFieldCreateUseCase from '../create.use-case';

let tableRepository: TableInMemoryRepository;
let fieldRepository: FieldInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let modelBuilder: InMemoryModelBuilder;
let sut: TableFieldCreateUseCase;

const BASE_PAYLOAD = {
  permissions: buildFieldPermissions(true, true, true),
  showInFilter: false,
  locked: false,
  allowCreateRelationshipRecords: false,
  required: false,
  category: [],
  dropdown: [],
  defaultValue: null,
  group: null,
  multiple: false,
  relationship: null,
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function createTable(repo: TableInMemoryRepository, slug = 'clientes') {
  return repo.create({
    name: 'Clientes',
    slug,
    _schema: {},
    fields: [],
    owner: 'owner-id',
    style: E_TABLE_STYLE.LIST,
    fieldOrderList: [],
    fieldOrderForm: [],
  });
}

describe('Table Field Create - TEXT_SHORT', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    fieldRepository = new FieldInMemoryRepository();
    schemaBuilder = new InMemorySchemaBuilder();
    modelBuilder = new InMemoryModelBuilder();

    sut = new TableFieldCreateUseCase(
      tableRepository,
      fieldRepository,
      schemaBuilder,
      modelBuilder,
      new RelationshipMaterializationService(
        fieldRepository,
        tableRepository,
        new RelationshipDefinitionInMemoryRepository(),
        schemaBuilder,
        modelBuilder,
      ),
    );
  });

  // ─── FORMATOS ───

  it('deve criar campo com formato ALPHA_NUMERIC', async () => {
    await createTable(tableRepository);

    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'clientes',
      name: 'Nome',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
    expect(result.value.format).toBe(E_FIELD_FORMAT.ALPHA_NUMERIC);
  });

  it('deve criar campo com formato INTEGER', async () => {
    await createTable(tableRepository);

    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'clientes',
      name: 'Idade',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.INTEGER,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.INTEGER);
  });

  it('deve criar campo com formato DECIMAL', async () => {
    await createTable(tableRepository);

    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'clientes',
      name: 'Salario',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.DECIMAL,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.DECIMAL);
  });

  it('deve criar campo com formato URL', async () => {
    await createTable(tableRepository);

    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'clientes',
      name: 'Website',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.URL,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.URL);
  });

  it('deve criar campo com formato EMAIL', async () => {
    await createTable(tableRepository);

    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'clientes',
      name: 'Email',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.EMAIL,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.EMAIL);
  });

  it('deve criar campo com formato PASSWORD', async () => {
    await createTable(tableRepository);

    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'clientes',
      name: 'Senha',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.PASSWORD,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.PASSWORD);
  });

  it('deve criar campo com formato PHONE', async () => {
    await createTable(tableRepository);

    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'clientes',
      name: 'Telefone',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.PHONE,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.PHONE);
  });

  it('deve criar campo com formato CNPJ', async () => {
    await createTable(tableRepository);

    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'clientes',
      name: 'CNPJ',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.CNPJ,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.CNPJ);
  });

  it('deve criar campo com formato CPF', async () => {
    await createTable(tableRepository);

    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'clientes',
      name: 'CPF',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.CPF,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.CPF);
  });

  // ─── PROPRIEDADES ───

  it('deve criar campo required=true', async () => {
    await createTable(tableRepository);

    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'clientes',
      name: 'Nome Obrigatorio',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      required: true,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.required).toBe(true);
  });

  it('deve criar campo com defaultValue', async () => {
    await createTable(tableRepository);

    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'clientes',
      name: 'Pais',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      defaultValue: 'Brasil',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.defaultValue).toBe('Brasil');
  });

  it('deve criar campo com visibilidade personalizada', async () => {
    await createTable(tableRepository);

    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'clientes',
      name: 'Campo Interno',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      permissions: buildFieldPermissions(false, true, false),
      showInFilter: true,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.permissions?.list.kind).toBe('NOBODY');
    expect(result.value.permissions?.form.kind).toBe('PUBLIC');
    expect(result.value.permissions?.detail.kind).toBe('NOBODY');
    expect(result.value.showInFilter).toBe(true);
  });

  it('deve gerar slug automaticamente a partir do nome', async () => {
    await createTable(tableRepository);

    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'clientes',
      name: 'Nome Completo',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.slug).toBe('nome-completo');
  });
});
