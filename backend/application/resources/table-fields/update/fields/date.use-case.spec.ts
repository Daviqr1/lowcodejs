import { beforeEach, describe, expect, it } from 'vitest';

import {
  E_FIELD_FORMAT,
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
      name: 'Data Evento',
      slug: 'data-evento',
      type: E_FIELD_TYPE.DATE,
      format: E_FIELD_FORMAT.DD_MM_YYYY,
      ...fieldOverrides,
    },
    table: { name: 'Eventos', slug: 'eventos' },
  });

const buildUpdatePayload = (
  field: IField,
  overrides: Partial<TableFieldUpdatePayload> = {},
): TableFieldUpdatePayload =>
  makeFieldUpdatePayload('eventos', field, overrides);

describe('Table Field Update - DATE', () => {
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

  it('deve mudar formato DD_MM_YYYY para YYYY_MM_DD_HH_MM_SS', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { format: E_FIELD_FORMAT.YYYY_MM_DD_HH_MM_SS }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.YYYY_MM_DD_HH_MM_SS);
  });

  it('deve mudar formato para DD_MM_YYYY_DASH', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, { format: E_FIELD_FORMAT.DD_MM_YYYY_DASH }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.DD_MM_YYYY_DASH);
  });

  it('deve mudar formato para YYYY_MM_DD_HH_MM_SS_DASH', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, {
        format: E_FIELD_FORMAT.YYYY_MM_DD_HH_MM_SS_DASH,
      }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.YYYY_MM_DD_HH_MM_SS_DASH);
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
