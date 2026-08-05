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
import {
  makeFieldUpdatePayload,
  makeFieldWithTable,
} from '@test/helpers/table-factory.helper';

import type { TableFieldUpdatePayload } from '../../_shared.validator';
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
      name: 'Status',
      slug: 'status',
      type: E_FIELD_TYPE.DROPDOWN,
      dropdown: [
        { id: '1', label: 'Ativo' },
        { id: '2', label: 'Inativo' },
      ],
      ...fieldOverrides,
    },
    table: { name: 'Tarefas', slug: 'tarefas' },
  });

const buildUpdatePayload = (
  field: IField,
  overrides: Partial<TableFieldUpdatePayload> = {},
): TableFieldUpdatePayload =>
  makeFieldUpdatePayload('tarefas', field, overrides);

describe('Table Field Update - DROPDOWN', () => {
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

  it('deve adicionar nova opcao ao dropdown', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, {
        dropdown: [
          { id: '1', label: 'Ativo' },
          { id: '2', label: 'Inativo' },
          { id: '3', label: 'Pendente' },
        ],
      }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.dropdown).toHaveLength(3);
    expect(result.value.dropdown[2].label).toBe('Pendente');
  });

  it('deve remover opcao do dropdown', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, {
        dropdown: [{ id: '1', label: 'Ativo' }],
      }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.dropdown).toHaveLength(1);
    expect(result.value.dropdown[0].label).toBe('Ativo');
  });

  it('deve mudar cor de opcao do dropdown', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
      {
        dropdown: [
          { id: '1', label: 'Ativo', color: '#00ff00' },
          { id: '2', label: 'Inativo', color: '#ff0000' },
        ],
      },
    );

    const result = await sut.execute(
      buildUpdatePayload(field, {
        dropdown: [
          { id: '1', label: 'Ativo', color: '#0000ff' },
          { id: '2', label: 'Inativo', color: '#ff0000' },
        ],
      }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.dropdown[0].color).toBe('#0000ff');
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

  it('deve atualizar permissao para criar novas tags no dropdown', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, {
        allowCustomDropdownOptions: true,
      }),
    );

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.allowCustomDropdownOptions).toBe(true);
  });

  it('deve rejeitar atualizacao com opcoes duplicadas por nome', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute(
      buildUpdatePayload(field, {
        dropdown: [
          { id: '1', label: 'Ativo' },
          { id: '2', label: ' ativo ' },
        ],
      }),
    );

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('DROPDOWN_OPTION_ALREADY_EXISTS');
  });
});
