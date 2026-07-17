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
  name: 'Status',
  slug: 'status',
  type: E_FIELD_TYPE.DROPDOWN,
  permissions: buildFieldPermissions(true, true, true),
  showInFilter: false,
  locked: false,
  allowCreateRelationshipRecords: false,
  native: false,
  required: false,
  category: [],
  dropdown: [
    { id: '1', label: 'Pendente', color: '#FFA500' },
    { id: '2', label: 'Aprovado', color: '#00FF00' },
  ],
  defaultValue: null,
  format: null,
  group: null,
  multiple: false,
  relationship: null,
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
};

const UPDATE_PAYLOAD_BASE = {
  slug: 'pedidos',
  groupSlug: 'itens',
  trashed: false,
  trashedAt: null,
  locked: false,
  allowCreateRelationshipRecords: false,
  category: [],
  defaultValue: null,
  group: null,
  multiple: false,
  relationship: null,
  format: null,
};

describe('Group Field Update - DROPDOWN', () => {
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

  it('deve adicionar nova opcao ao dropdown', async () => {
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
      name: 'Status',
      type: E_FIELD_TYPE.DROPDOWN,
      required: false,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: false,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      dropdown: [
        { id: '1', label: 'Pendente', color: '#FFA500' },
        { id: '2', label: 'Aprovado', color: '#00FF00' },
        { id: '3', label: 'Rejeitado', color: '#FF0000' },
      ],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.dropdown).toHaveLength(3);
    expect(result.value.dropdown[2].label).toBe('Rejeitado');
    expect(result.value.dropdown[2].color).toBe('#FF0000');
  });

  it('deve mudar required de false para true', async () => {
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
      name: 'Status',
      type: E_FIELD_TYPE.DROPDOWN,
      required: true,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: false,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      dropdown: [
        { id: '1', label: 'Pendente', color: '#FFA500' },
        { id: '2', label: 'Aprovado', color: '#00FF00' },
      ],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.required).toBe(true);
    expect(result.value.type).toBe(E_FIELD_TYPE.DROPDOWN);
  });

  it('deve rejeitar atualizacao com opcoes duplicadas por nome no grupo', async () => {
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
      name: 'Status',
      type: E_FIELD_TYPE.DROPDOWN,
      required: false,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: false,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      dropdown: [
        { id: '1', label: 'Pendente' },
        { id: '2', label: ' pendente ' },
      ],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('DROPDOWN_OPTION_ALREADY_EXISTS');
  });
});
