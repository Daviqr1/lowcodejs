import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
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
import {
  makeFieldUpdatePayload,
  makeFieldWithTable,
} from '@test/helpers/table-factory.helper';

import TableFieldUpdateUseCase from '../update.use-case';
import type { TableFieldUpdatePayload } from '../update.validator';

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
      name: 'Avaliacao',
      slug: 'avaliacao',
      type: E_FIELD_TYPE.EVALUATION,
      ...fieldOverrides,
    },
    table: { name: 'Servicos', slug: 'servicos' },
  });

const buildUpdatePayload = (
  field: IField,
  overrides: Partial<TableFieldUpdatePayload> = {},
): TableFieldUpdatePayload =>
  makeFieldUpdatePayload('servicos', field, overrides);

describe('Table Field Update - EVALUATION', () => {
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

  it('deve mudar visibilidade de lista e detalhe', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, {
        permissions: buildFieldPermissions(false, true, false),
      }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.permissions?.list.kind).toBe('NOBODY');
    expect(result.value.permissions?.detail.kind).toBe('NOBODY');
    expect(result.value.permissions?.form.kind).toBe('PUBLIC');
  });
});
