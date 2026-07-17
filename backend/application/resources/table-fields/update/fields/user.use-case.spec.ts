import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
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
  slug: 'responsavel',
  type: E_FIELD_TYPE.USER,
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
    name: 'Responsavel',
    ...fieldOverrides,
  });

  const table = await tableRepo.create({
    name: 'Tarefas',
    slug: 'tarefas',
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
    slug: 'tarefas',
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

describe('Table Field Update - USER', () => {
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
});
