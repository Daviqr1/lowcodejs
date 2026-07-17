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
  multiple: false,
  relationship: null,
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
};

describe('Group Field Create - REACTION', () => {
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

  // Invariante nível único: REACTION é campo de sistema e NÃO pode existir
  // dentro de um grupo. O use-case bloqueia (TYPES_NOT_ALLOWED_IN_GROUP).
  it('deve bloquear criação de campo REACTION no grupo', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Curtida',
      type: E_FIELD_TYPE.REACTION,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('FIELD_TYPE_NOT_ALLOWED_IN_GROUP');
  });

  it('deve bloquear REACTION no grupo mesmo sem formato', async () => {
    const result = await sut.execute({
      ...FIELD_PAYLOAD_BASE,
      slug: 'pedidos',
      groupSlug: 'itens',
      name: 'Aprovacao',
      type: E_FIELD_TYPE.REACTION,
      format: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('FIELD_TYPE_NOT_ALLOWED_IN_GROUP');
  });
});
