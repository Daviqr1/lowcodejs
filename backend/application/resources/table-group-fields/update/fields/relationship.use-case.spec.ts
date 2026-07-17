import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
} from '@application/core/entity.core';
import type { FieldCreatePayload } from '@application/repositories/field/field-contract.repository';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryModelBuilder from '@application/services/table/in-memory-model-builder.service';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';

import GroupFieldUpdateUseCase from '../update.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let modelBuilder: InMemoryModelBuilder;
let sut: GroupFieldUpdateUseCase;

const TABLE_DEFAULTS = {
  _schema: {},
  fields: [],
  owner: 'owner-id',
  style: E_TABLE_STYLE.LIST,
  fieldOrderList: [],
  fieldOrderForm: [],
};

const FIELD_CREATE_PAYLOAD = {
  name: 'Produto',
  slug: 'produto',
  type: E_FIELD_TYPE.RELATIONSHIP,
  permissions: buildFieldPermissions(true, true, true),
  showInFilter: false,
  locked: false,
  allowCreateRelationshipRecords: false,
  native: false,
  required: false,
  category: [],
  dropdown: [],
  defaultValue: null,
  format: null,
  group: null,
  multiple: false,
  relationship: {
    table: { _id: 'table-produtos-id', slug: 'produtos' },
    field: { _id: 'field-nome-id', slug: 'nome' },
    order: 'asc',
  },
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
} satisfies FieldCreatePayload;

const UPDATE_PAYLOAD_BASE = {
  slug: 'pedidos',
  groupSlug: 'itens',
  trashed: false,
  trashedAt: null,
  locked: false,
  allowCreateRelationshipRecords: false,
  category: [],
  dropdown: [],
  defaultValue: null,
  group: null,
  format: null,
};

describe('Group Field Update - RELATIONSHIP', () => {
  beforeEach(async () => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    schemaBuilder = new InMemorySchemaBuilder();
    modelBuilder = new InMemoryModelBuilder();

    sut = new GroupFieldUpdateUseCase(
      tableInMemoryRepository,
      fieldInMemoryRepository,
      schemaBuilder,
      modelBuilder,
    );
  });

  // RELATIONSHIP é sempre top-level (§2): não pode existir nem virar campo de
  // grupo. Atualizar um campo de grupo para type RELATIONSHIP é rejeitado com
  // FIELD_TYPE_NOT_ALLOWED_IN_GROUP, antes de qualquer mutação.
  it('deve rejeitar atualizar campo de grupo para RELATIONSHIP (mudar tabela destino)', async () => {
    const field = await fieldInMemoryRepository.create(FIELD_CREATE_PAYLOAD);

    await tableInMemoryRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Pedidos',
      slug: 'pedidos',
      groups: [
        {
          slug: 'itens',
          name: 'Itens',
          fields: [field],
          _schema: {},
        },
      ],
    });

    const result = await sut.execute({
      ...UPDATE_PAYLOAD_BASE,
      fieldId: field._id,
      name: 'Produto',
      type: E_FIELD_TYPE.RELATIONSHIP,
      required: false,
      multiple: false,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: false,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      relationship: {
        table: { _id: 'table-servicos-id', slug: 'servicos' },
        field: { _id: 'field-titulo-id', slug: 'titulo' },
        order: 'asc',
      },
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('FIELD_TYPE_NOT_ALLOWED_IN_GROUP');
    expect(result.value.code).toBe(400);
  });

  it('deve rejeitar atualizar campo de grupo para RELATIONSHIP multiple', async () => {
    const field = await fieldInMemoryRepository.create(FIELD_CREATE_PAYLOAD);

    await tableInMemoryRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Pedidos',
      slug: 'pedidos',
      groups: [
        {
          slug: 'itens',
          name: 'Itens',
          fields: [field],
          _schema: {},
        },
      ],
    });

    const result = await sut.execute({
      ...UPDATE_PAYLOAD_BASE,
      fieldId: field._id,
      name: 'Produto',
      type: E_FIELD_TYPE.RELATIONSHIP,
      required: false,
      multiple: true,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: false,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      relationship: {
        table: { _id: 'table-produtos-id', slug: 'produtos' },
        field: { _id: 'field-nome-id', slug: 'nome' },
        order: 'asc',
      },
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('FIELD_TYPE_NOT_ALLOWED_IN_GROUP');
  });
});
