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

import GroupFieldCreateUseCase from '../create.use-case';

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

describe('Group Field Create - TEXT_SHORT', () => {
  beforeEach(async () => {
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

    await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Pedidos',
      slug: 'pedidos',
      groups: [
        {
          slug: 'itens',
          name: 'Itens',
          fields: [],
          _schema: {},
        },
      ],
    });
  });

  it('deve criar campo TEXT_SHORT com formato ALPHA_NUMERIC no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Codigo',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
    expect(result.value.format).toBe(E_FIELD_FORMAT.ALPHA_NUMERIC);
    expect(result.value.slug).toBe('codigo');
  });

  it('deve criar campo TEXT_SHORT com formato INTEGER no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Quantidade',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.INTEGER,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
    expect(result.value.format).toBe(E_FIELD_FORMAT.INTEGER);
  });

  it('deve criar campo TEXT_SHORT com formato DECIMAL no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Preco',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.DECIMAL,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
    expect(result.value.format).toBe(E_FIELD_FORMAT.DECIMAL);
  });

  it('deve criar campo TEXT_SHORT com formato URL no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Link',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.URL,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
    expect(result.value.format).toBe(E_FIELD_FORMAT.URL);
  });

  it('deve criar campo TEXT_SHORT com formato EMAIL no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Email Contato',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.EMAIL,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
    expect(result.value.format).toBe(E_FIELD_FORMAT.EMAIL);
  });

  it('deve criar campo TEXT_SHORT com formato PASSWORD no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Senha',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.PASSWORD,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
    expect(result.value.format).toBe(E_FIELD_FORMAT.PASSWORD);
  });

  it('deve criar campo TEXT_SHORT com formato PHONE no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Telefone',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.PHONE,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
    expect(result.value.format).toBe(E_FIELD_FORMAT.PHONE);
  });

  it('deve criar campo TEXT_SHORT com formato CNPJ no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'CNPJ Empresa',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.CNPJ,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
    expect(result.value.format).toBe(E_FIELD_FORMAT.CNPJ);
  });

  it('deve criar campo TEXT_SHORT com formato CPF no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'CPF Cliente',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.CPF,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
    expect(result.value.format).toBe(E_FIELD_FORMAT.CPF);
  });

  it('deve criar campo TEXT_SHORT required no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Campo Obrigatorio',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      required: true,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.required).toBe(true);
  });

  it('deve criar campo TEXT_SHORT com defaultValue no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Status Padrao',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      defaultValue: 'pendente',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.defaultValue).toBe('pendente');
  });
});
