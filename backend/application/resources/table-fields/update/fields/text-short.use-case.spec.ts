import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  type IField,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RelationshipDefinitionInMemoryRepository from '@application/repositories/relationship-definition/relationship-definition-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import RelationshipMaterializationService from '@application/services/relationship/relationship-materialization.service';
import InMemoryModelBuilder from '@application/services/table/in-memory-model-builder.service';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';

import TableFieldUpdateUseCase from '../update.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let modelBuilder: InMemoryModelBuilder;
let sut: TableFieldUpdateUseCase;

const FIELD_DEFAULTS = {
  slug: 'nome',
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function createFieldAndTable(
  fieldRepo: FieldInMemoryRepository,
  tableRepo: TableInMemoryRepository,
  fieldOverrides: Partial<IField> = {},
) {
  const field = await fieldRepo.create({
    ...FIELD_DEFAULTS,
    name: 'Nome',
    ...fieldOverrides,
  });

  const table = await tableRepo.create({
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

  return { field, table };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function buildUpdatePayload(
  field: IField,
  overrides: Record<string, unknown> = {},
) {
  return {
    slug: 'clientes',
    _id: field._id,
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
    trashed: false,
    trashedAt: null,
    locked: false,
    allowCreateRelationshipRecords: false,
    permissions: field.permissions,
    showInFilter: field.showInFilter,
    widthInForm: field.widthInForm,
    widthInList: field.widthInList,
    widthInDetail: field.widthInDetail,
    ...overrides,
  };
}

describe('Table Field Update - TEXT_SHORT', () => {
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

  // --- FORMATOS ---

  it('deve mudar formato ALPHA_NUMERIC para EMAIL', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { format: E_FIELD_FORMAT.EMAIL }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.EMAIL);
  });

  it('deve mudar formato EMAIL para PASSWORD', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
      { format: E_FIELD_FORMAT.EMAIL },
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { format: E_FIELD_FORMAT.PASSWORD }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.PASSWORD);
  });

  it('deve mudar formato para ALPHA_NUMERIC', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
      { format: E_FIELD_FORMAT.EMAIL },
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { format: E_FIELD_FORMAT.ALPHA_NUMERIC }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.ALPHA_NUMERIC);
  });

  it('deve mudar formato para INTEGER', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { format: E_FIELD_FORMAT.INTEGER }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.INTEGER);
  });

  it('deve mudar formato para DECIMAL', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { format: E_FIELD_FORMAT.DECIMAL }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.DECIMAL);
  });

  it('deve mudar formato para URL', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { format: E_FIELD_FORMAT.URL }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.URL);
  });

  it('deve mudar formato para EMAIL', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { format: E_FIELD_FORMAT.EMAIL }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.EMAIL);
  });

  it('deve mudar formato para PASSWORD', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { format: E_FIELD_FORMAT.PASSWORD }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.PASSWORD);
  });

  it('deve mudar formato para PHONE', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { format: E_FIELD_FORMAT.PHONE }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.PHONE);
  });

  it('deve mudar formato para CNPJ', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { format: E_FIELD_FORMAT.CNPJ }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.CNPJ);
  });

  it('deve mudar formato para CPF', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { format: E_FIELD_FORMAT.CPF }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.CPF);
  });

  // --- PROPRIEDADES ---

  it('deve mudar required false para true', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { required: true }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.required).toBe(true);
  });

  it('deve mudar visibilidade de lista para visivel e de formulario para oculto', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
      { permissions: buildFieldPermissions(false, true, true) },
    );

    const result = await sut.execute(
      buildUpdatePayload(field, {
        permissions: buildFieldPermissions(true, false, true),
      }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.permissions?.list.kind).toBe('PUBLIC');
    expect(result.value.permissions?.form.kind).toBe('NOBODY');
  });

  it('deve mudar widthInForm 50 para 75 e widthInList 10 para 30', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { widthInForm: 75, widthInList: 30 }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.widthInForm).toBe(75);
    expect(result.value.widthInList).toBe(30);
  });

  it('deve mudar defaultValue de null para Brasil', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { defaultValue: 'Brasil' }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.defaultValue).toBe('Brasil');
  });

  it('deve mudar nome e gerar novo slug automaticamente', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { name: 'Nome Completo' }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.name).toBe('Nome Completo');
    expect(result.value.slug).toBe('nome-completo');
  });

  // --- CAMPO NATIVE ---

  it('campo NATIVE deve permitir mudar visibilidade de lista e widthInList', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
      { native: true },
    );

    const result = await sut.execute({
      slug: 'clientes',
      _id: field._id,
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
      trashed: false,
      trashedAt: null,
      locked: false,
      allowCreateRelationshipRecords: false,
      permissions: buildFieldPermissions(false, true, true),
      showInFilter: true,
      widthInForm: 50,
      widthInList: 30,
      widthInDetail: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.permissions?.list.kind).toBe('NOBODY');
    expect(result.value.widthInList).toBe(30);
  });

  it('campo NATIVE deve ignorar mudanca de name e preservar o nome original', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
      { native: true },
    );

    const result = await sut.execute({
      slug: 'clientes',
      _id: field._id,
      name: 'Outro Nome',
      type: field.type,
      format: field.format,
      required: field.required,
      multiple: field.multiple,
      defaultValue: field.defaultValue,
      relationship: field.relationship,
      dropdown: field.dropdown,
      category: field.category,
      group: field.group,
      trashed: false,
      trashedAt: null,
      locked: false,
      allowCreateRelationshipRecords: false,
      permissions: field.permissions,
      showInFilter: field.showInFilter,
      widthInForm: field.widthInForm,
      widthInList: field.widthInList,
      widthInDetail: field.widthInDetail,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.name).toBe(field.name);
  });

  it('campo NATIVE deve ignorar mudanca de format e preservar o formato original', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
      { native: true },
    );

    const result = await sut.execute({
      slug: 'clientes',
      _id: field._id,
      name: field.name,
      type: field.type,
      format: E_FIELD_FORMAT.EMAIL,
      required: field.required,
      multiple: field.multiple,
      defaultValue: field.defaultValue,
      relationship: field.relationship,
      dropdown: field.dropdown,
      category: field.category,
      group: field.group,
      trashed: false,
      trashedAt: null,
      locked: false,
      allowCreateRelationshipRecords: false,
      permissions: field.permissions,
      showInFilter: field.showInFilter,
      widthInForm: field.widthInForm,
      widthInList: field.widthInList,
      widthInDetail: field.widthInDetail,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(field.format);
  });

  it('campo NATIVE deve rejeitar trashed=true com NATIVE_FIELD_CANNOT_BE_TRASHED', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
      { native: true },
    );

    const result = await sut.execute({
      slug: 'clientes',
      _id: field._id,
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
      trashed: true,
      trashedAt: null,
      locked: false,
      allowCreateRelationshipRecords: false,
      permissions: field.permissions,
      showInFilter: field.showInFilter,
      widthInForm: field.widthInForm,
      widthInList: field.widthInList,
      widthInDetail: field.widthInDetail,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(403);
    expect(result.value.cause).toBe('NATIVE_FIELD_CANNOT_BE_TRASHED');
  });

  // --- CAMPO LOCKED ---

  it('campo LOCKED deve permitir mudar visibilidade de lista', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
      { locked: true, native: false },
    );

    const result = await sut.execute({
      slug: 'clientes',
      _id: field._id,
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
      trashed: false,
      trashedAt: null,
      locked: true,
      allowCreateRelationshipRecords: false,
      permissions: buildFieldPermissions(false, true, true),
      showInFilter: field.showInFilter,
      widthInForm: field.widthInForm,
      widthInList: field.widthInList,
      widthInDetail: field.widthInDetail,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.permissions?.list.kind).toBe('NOBODY');
  });

  it('campo LOCKED deve rejeitar mudar name com FIELD_LOCKED', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
      { locked: true, native: false },
    );

    const result = await sut.execute({
      slug: 'clientes',
      _id: field._id,
      name: 'Outro Nome',
      type: field.type,
      format: field.format,
      required: field.required,
      multiple: field.multiple,
      defaultValue: field.defaultValue,
      relationship: field.relationship,
      dropdown: field.dropdown,
      category: field.category,
      group: field.group,
      trashed: false,
      trashedAt: null,
      locked: true,
      allowCreateRelationshipRecords: false,
      permissions: field.permissions,
      showInFilter: field.showInFilter,
      widthInForm: field.widthInForm,
      widthInList: field.widthInList,
      widthInDetail: field.widthInDetail,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(403);
    expect(result.value.cause).toBe('FIELD_LOCKED');
  });

  it('campo LOCKED deve rejeitar mudar required com FIELD_LOCKED', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
      { locked: true, native: false },
    );

    const result = await sut.execute({
      slug: 'clientes',
      _id: field._id,
      name: field.name,
      type: field.type,
      format: field.format,
      required: true,
      multiple: field.multiple,
      defaultValue: field.defaultValue,
      relationship: field.relationship,
      dropdown: field.dropdown,
      category: field.category,
      group: field.group,
      trashed: false,
      trashedAt: null,
      locked: true,
      allowCreateRelationshipRecords: false,
      permissions: field.permissions,
      showInFilter: field.showInFilter,
      widthInForm: field.widthInForm,
      widthInList: field.widthInList,
      widthInDetail: field.widthInDetail,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(403);
    expect(result.value.cause).toBe('FIELD_LOCKED');
  });
});
