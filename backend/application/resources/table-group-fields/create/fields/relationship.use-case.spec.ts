import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
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
  format: null,
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
};

describe('Group Field Create - RELATIONSHIP', () => {
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

  // RELATIONSHIP é sempre top-level (§2): associação entre tabelas independentes.
  // Grupo é composição embedded e só aceita campos simples — criar RELATIONSHIP
  // dentro de grupo é rejeitado com FIELD_TYPE_NOT_ALLOWED_IN_GROUP.
  it('deve rejeitar criar campo RELATIONSHIP dentro de grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Produto',
      type: E_FIELD_TYPE.RELATIONSHIP,
      multiple: false,
      relationship: {
        table: { _id: 'table-produtos-id', slug: 'produtos' },
        field: { _id: 'field-nome-id', slug: 'nome' },
        order: 'asc',
      },
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('FIELD_TYPE_NOT_ALLOWED_IN_GROUP');
    expect(result.value.code).toBe(400);
  });

  it('deve rejeitar criar campo RELATIONSHIP multiple dentro de grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Fornecedores',
      type: E_FIELD_TYPE.RELATIONSHIP,
      multiple: true,
      relationship: {
        table: { _id: 'table-fornecedores-id', slug: 'fornecedores' },
        field: { _id: 'field-razao-id', slug: 'razao-social' },
        order: 'asc',
      },
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('FIELD_TYPE_NOT_ALLOWED_IN_GROUP');
  });

  it('deve rejeitar criar campo RELATIONSHIP required dentro de grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Cliente',
      type: E_FIELD_TYPE.RELATIONSHIP,
      multiple: false,
      required: true,
      relationship: {
        table: { _id: 'table-clientes-id', slug: 'clientes' },
        field: { _id: 'field-nome-id', slug: 'nome' },
        order: 'asc',
      },
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('FIELD_TYPE_NOT_ALLOWED_IN_GROUP');
  });
});
