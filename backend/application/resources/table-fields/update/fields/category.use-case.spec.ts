// Spec constrói mocks parciais de entidades do domínio via asserção.

import { beforeEach, describe, expect, it } from 'vitest';

import {
  E_FIELD_TYPE,
  type IField,
  type ITable,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RelationshipDefinitionInMemoryRepository from '@application/repositories/relationship-definition/relationship-definition-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import FieldValueService from '@application/services/field-value/field-value.service';
import RelationshipMaterializationService from '@application/services/relationship/relationship-materialization.service';
import SlugService from '@application/services/slug/slug.service';
import InMemoryModelBuilder from '@application/services/table/in-memory-model-builder.service';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';
import TypeGuardService from '@application/services/type-guard/type-guard.service';
import { InMemoryCascadeDropdownConfigRepository } from '@extensions/forms/plugins/cascade-dropdown/in-memory-cascade-dropdown-config.repository';
import { makeFieldWithTable } from '@test/helpers/table-factory.helper';

import TableFieldUpdateUseCase from '../update.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let modelBuilder: InMemoryModelBuilder;
let sut: TableFieldUpdateUseCase;

const createFieldAndTable = (
  fieldRepo: FieldInMemoryRepository,
  tableRepo: TableInMemoryRepository,
  fieldOverrides: Partial<IField> = {},
): Promise<{ field: IField; table: ITable }> =>
  makeFieldWithTable(fieldRepo, tableRepo, {
    field: {
      name: 'Categorias',
      slug: 'categorias',
      type: E_FIELD_TYPE.CATEGORY,
      category: [
        { id: '1', label: 'Tecnologia', children: [] },
        { id: '2', label: 'Saude', children: [] },
      ],
      ...fieldOverrides,
    },
    table: { name: 'Artigos', slug: 'artigos' },
  });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function buildUpdatePayload(
  field: IField,
  overrides: Record<string, unknown> = {},
) {
  return {
    slug: 'artigos',
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

describe('Table Field Update - CATEGORY', () => {
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
        new SlugService(),
      ),
      new SlugService(),
      new FieldValueService(new TypeGuardService()),
      new InMemoryCascadeDropdownConfigRepository(),
    );
  });

  it('deve mudar arvore de categorias adicionando e removendo nodes', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, {
        category: [
          { id: '1', label: 'Tecnologia', children: [] },
          {
            id: '3',
            label: 'Educacao',
            children: [{ id: '3.1', label: 'Ensino Superior', children: [] }],
          },
        ],
      }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.category).toHaveLength(2);
    expect(result.value.category[0].label).toBe('Tecnologia');
    expect(result.value.category[1].label).toBe('Educacao');
    expect(result.value.category[1].children).toHaveLength(1);
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
