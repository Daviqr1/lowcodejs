import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
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
  slug: 'itens',
  type: E_FIELD_TYPE.FIELD_GROUP,
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
  group: { slug: 'itens' },
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
) {
  const field = await fieldRepo.create({
    ...FIELD_DEFAULTS,
    name: 'Itens',
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
    groups: [
      {
        slug: 'itens',
        name: 'Itens',
        fields: [],
        _schema: {},
      },
    ],
  });

  table.fields = [field];

  return { field, table };
}

describe('Table Field Update - FIELD_GROUP', () => {
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

  it('deve renomear nome do campo e atualizar slug do grupo', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    const result = await sut.execute({
      slug: 'pedidos',
      _id: field._id,
      name: 'Produtos',
      type: E_FIELD_TYPE.FIELD_GROUP,
      format: null,
      required: false,
      multiple: false,
      defaultValue: null,
      relationship: null,
      dropdown: [],
      category: [],
      group: { slug: 'itens', _id: 'group-id' },
      trashed: false,
      trashedAt: null,
      locked: false,
      allowCreateRelationshipRecords: false,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: false,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.name).toBe('Produtos');
    expect(result.value.slug).toBe('produtos');
    expect(result.value.group).not.toBeNull();
    expect(result.value.group!.slug).toBe('produtos');
  });

  it('deve chamar syncModel quando slug muda', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    await sut.execute({
      slug: 'pedidos',
      _id: field._id,
      name: 'Componentes',
      type: E_FIELD_TYPE.FIELD_GROUP,
      format: null,
      required: false,
      multiple: false,
      defaultValue: null,
      relationship: null,
      dropdown: [],
      category: [],
      group: { slug: 'itens', _id: 'group-id' },
      trashed: false,
      trashedAt: null,
      locked: false,
      allowCreateRelationshipRecords: false,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: false,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
    });

    expect(modelBuilder.buildCallCount).toBeGreaterThanOrEqual(1);
  });

  it('deve atualizar slug do grupo na tabela', async () => {
    const { field } = await createFieldAndTable(
      fieldInMemoryRepository,
      tableInMemoryRepository,
    );

    await sut.execute({
      slug: 'pedidos',
      _id: field._id,
      name: 'Materiais',
      type: E_FIELD_TYPE.FIELD_GROUP,
      format: null,
      required: false,
      multiple: false,
      defaultValue: null,
      relationship: null,
      dropdown: [],
      category: [],
      group: { slug: 'itens', _id: 'group-id' },
      trashed: false,
      trashedAt: null,
      locked: false,
      allowCreateRelationshipRecords: false,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: false,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
    });

    const updatedTable = await tableInMemoryRepository.findBySlug('pedidos');
    expect(updatedTable?.groups).toBeDefined();

    const updatedGroup = updatedTable!.groups!.find(
      (g: { slug: string }) => g.slug === 'materiais',
    );
    expect(updatedGroup).toBeDefined();
    expect(updatedGroup!.name).toBe('Materiais');
  });
});
