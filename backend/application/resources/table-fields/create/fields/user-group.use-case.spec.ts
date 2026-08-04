import { beforeEach, describe, expect, it } from 'vitest';

import {
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  buildFieldPermissions,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RelationshipDefinitionInMemoryRepository from '@application/repositories/relationship-definition/relationship-definition-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import RelationshipMaterializationService from '@application/services/relationship/relationship-materialization.service';
import SlugService from '@application/services/slug/slug.service';
import InMemoryModelBuilder from '@application/services/table/in-memory-model-builder.service';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';

import TableFieldCreateUseCase from '../create.use-case';

let tableRepository: TableInMemoryRepository;
let fieldRepository: FieldInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let modelBuilder: InMemoryModelBuilder;
let sut: TableFieldCreateUseCase;

const BASE_PAYLOAD = {
  permissions: buildFieldPermissions(true, true, true),
  showInFilter: false,
  locked: false,
  allowCreateRelationshipRecords: false,
  required: false,
  category: [],
  dropdown: [],
  defaultValue: null,
  group: null,
  multiple: false,
  relationship: null,
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
  format: null,
};

describe('Table Field Create - USER_GROUP', () => {
  beforeEach(async () => {
    tableRepository = new TableInMemoryRepository();
    fieldRepository = new FieldInMemoryRepository();
    schemaBuilder = new InMemorySchemaBuilder();
    modelBuilder = new InMemoryModelBuilder();

    sut = new TableFieldCreateUseCase(
      tableRepository,
      fieldRepository,
      schemaBuilder,
      modelBuilder,
      new RelationshipMaterializationService(
        fieldRepository,
        tableRepository,
        new RelationshipDefinitionInMemoryRepository(),
        schemaBuilder,
        modelBuilder,
        new SlugService(),
      ),
      new SlugService(),
    );

    await tableRepository.create({
      name: 'Tarefas',
      slug: 'tarefas',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });
  });

  it('deve criar campo USER_GROUP', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'tarefas',
      name: 'Grupos com acesso',
      type: E_FIELD_TYPE.USER_GROUP,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.USER_GROUP);
  });

  it('deve criar campo USER_GROUP multiple=true', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'tarefas',
      name: 'Grupos participantes',
      type: E_FIELD_TYPE.USER_GROUP,
      multiple: true,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.multiple).toBe(true);
  });

  it('deve criar campo USER_GROUP required=true', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'tarefas',
      name: 'Grupo dono',
      type: E_FIELD_TYPE.USER_GROUP,
      required: true,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.required).toBe(true);
  });
});
