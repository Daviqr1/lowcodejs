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

describe('Group Field Create - TEXT_LONG', () => {
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

  it('deve criar campo TEXT_LONG com formato RICH_TEXT no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Descricao Rica',
      type: E_FIELD_TYPE.TEXT_LONG,
      format: E_FIELD_FORMAT.RICH_TEXT,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_LONG);
    expect(result.value.format).toBe(E_FIELD_FORMAT.RICH_TEXT);
    expect(result.value.slug).toBe('descricao-rica');
  });

  it('deve criar campo TEXT_LONG com formato PLAIN_TEXT no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Observacoes',
      type: E_FIELD_TYPE.TEXT_LONG,
      format: E_FIELD_FORMAT.PLAIN_TEXT,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_LONG);
    expect(result.value.format).toBe(E_FIELD_FORMAT.PLAIN_TEXT);
  });

  it('deve criar campo TEXT_LONG required no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Detalhes',
      type: E_FIELD_TYPE.TEXT_LONG,
      format: E_FIELD_FORMAT.RICH_TEXT,
      required: true,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.required).toBe(true);
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_LONG);
  });
});
