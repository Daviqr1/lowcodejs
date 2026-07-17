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
  name: 'Codigo',
  slug: 'codigo',
  type: E_FIELD_TYPE.TEXT_SHORT,
  permissions: buildFieldPermissions(true, true, true),
  showInFilter: true,
  locked: false,
  allowCreateRelationshipRecords: false,
  native: false,
  required: false,
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
};

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
  multiple: false,
  relationship: null,
  htmlContent: null,
};

describe('Group Field Update - TEXT_SHORT', () => {
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

  it('deve mudar formato de ALPHA_NUMERIC para EMAIL', async () => {
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
      name: 'Codigo',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.EMAIL,
      required: false,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.EMAIL);
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
  });

  it('deve mudar formato de EMAIL para PASSWORD', async () => {
    const field = await fieldInMemoryRepository.create({
      ...FIELD_CREATE_PAYLOAD,
      format: E_FIELD_FORMAT.EMAIL,
    });

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
      name: 'Codigo',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.PASSWORD,
      required: false,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.PASSWORD);
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
      name: 'Codigo',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      required: true,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.required).toBe(true);
  });

  it('deve mudar visibilidade de lista de PUBLIC para NOBODY', async () => {
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
      name: 'Codigo',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      required: false,
      permissions: buildFieldPermissions(false, true, true),
      showInFilter: true,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.permissions?.list.kind).toBe('NOBODY');
  });

  it('deve mudar widths', async () => {
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
      name: 'Codigo',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      required: false,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      widthInForm: 100,
      widthInList: 25,
      widthInDetail: 75,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.widthInForm).toBe(100);
    expect(result.value.widthInList).toBe(25);
    expect(result.value.widthInDetail).toBe(75);
  });

  it('deve mudar defaultValue', async () => {
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
      name: 'Codigo',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      required: false,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      defaultValue: 'valor-padrao',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.defaultValue).toBe('valor-padrao');
  });

  it('deve mudar nome e gerar novo slug', async () => {
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
      name: 'Codigo Interno',
      type: E_FIELD_TYPE.TEXT_SHORT,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      required: false,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.name).toBe('Codigo Interno');
    expect(result.value.slug).toBe('codigo-interno');
  });

  it('deve permitir mudar visibilidade de campo NATIVE', async () => {
    const field = await fieldInMemoryRepository.create({
      ...FIELD_CREATE_PAYLOAD,
      native: true,
    });

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
      name: field.name,
      type: field.type,
      format: field.format,
      required: field.required,
      multiple: field.multiple,
      defaultValue: field.defaultValue,
      relationship: field.relationship,
      dropdown: field.dropdown,
      category: field.category,
      group: field.group,
      permissions: buildFieldPermissions(false, true, true),
      showInFilter: true,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.permissions?.list.kind).toBe('NOBODY');
  });

  it('deve ignorar mudanca de name em campo NATIVE e preservar o nome original', async () => {
    const field = await fieldInMemoryRepository.create({
      ...FIELD_CREATE_PAYLOAD,
      native: true,
    });

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
      name: 'Nome Diferente',
      type: field.type,
      format: field.format,
      required: field.required,
      multiple: field.multiple,
      defaultValue: field.defaultValue,
      relationship: field.relationship,
      dropdown: field.dropdown,
      category: field.category,
      group: field.group,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.name).toBe(field.name);
  });

  it('deve permitir mudar visibilidade de campo LOCKED', async () => {
    const field = await fieldInMemoryRepository.create({
      ...FIELD_CREATE_PAYLOAD,
      locked: true,
    });

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
      locked: true,
      name: field.name,
      type: field.type,
      format: field.format,
      required: field.required,
      multiple: field.multiple,
      defaultValue: field.defaultValue,
      relationship: field.relationship,
      dropdown: field.dropdown,
      category: field.category,
      group: field.group,
      permissions: buildFieldPermissions(false, true, true),
      showInFilter: true,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.permissions?.list.kind).toBe('NOBODY');
  });

  it('deve rejeitar mudar name de campo LOCKED com FIELD_LOCKED', async () => {
    const field = await fieldInMemoryRepository.create({
      ...FIELD_CREATE_PAYLOAD,
      locked: true,
    });

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
      locked: true,
      name: 'Nome Diferente',
      type: field.type,
      format: field.format,
      required: field.required,
      multiple: field.multiple,
      defaultValue: field.defaultValue,
      relationship: field.relationship,
      dropdown: field.dropdown,
      category: field.category,
      group: field.group,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(403);
    expect(result.value.cause).toBe('FIELD_LOCKED');
  });
});
