import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  type IField,
} from '@application/core/entity.core';
import type { FieldCreatePayload } from '@application/repositories/field/field-contract.repository';
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
  name: 'Produtos',
  slug: 'produtos',
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
    table: { _id: '507f1f77bcf86cd799439099', slug: 'produtos' },
    field: { _id: '507f1f77bcf86cd799439088', slug: 'nome' },
    order: 'asc',
  },
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
} satisfies FieldCreatePayload;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function createFieldAndTable(
  fieldRepo: FieldInMemoryRepository,
  tableRepo: TableInMemoryRepository,
  fieldOverrides: Partial<IField> = {},
) {
  const field = await fieldRepo.create({
    ...FIELD_DEFAULTS,
    ...fieldOverrides,
  });

  const table = await tableRepo.create({
    name: 'Pedidos',
    slug: 'pedidos',
    _schema: {},
    fields: [field._id],
    owner: 'owner-id',
    style: E_TABLE_STYLE.LIST,
    fieldOrderList: [],
    fieldOrderForm: [],
  });

  table.fields = [field];

  // Tabelas alvo dos relacionamentos (born-pivot/sync exige target existente).
  for (const slug of ['produtos', 'clientes']) {
    await tableRepo.create({
      name: slug,
      slug,
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });
  }

  return { field, table };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function buildUpdatePayload(
  field: IField,
  overrides: Record<string, unknown> = {},
) {
  return {
    slug: 'pedidos',
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

describe('Table Field Update - RELATIONSHIP', () => {
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

  it('deve mudar tabela destino do relacionamento', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, {
        relationship: {
          table: { _id: '607f1f77bcf86cd799439011', slug: 'clientes' },
          field: { _id: '607f1f77bcf86cd799439022', slug: 'nome' },
          order: 'asc',
        },
      }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.relationship).not.toBeNull();
    expect(result.value.relationship!.table.slug).toBe('clientes');
  });

  it('deve mudar order de asc para desc', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, {
        relationship: {
          table: { _id: '507f1f77bcf86cd799439099', slug: 'produtos' },
          field: { _id: '507f1f77bcf86cd799439088', slug: 'nome' },
          order: 'desc',
        },
      }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.relationship!.order).toBe('desc');
  });

  it('deve mudar multiple false para true', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { multiple: true }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.multiple).toBe(true);
  });
});
