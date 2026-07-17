import { beforeEach, describe, expect, it } from 'vitest';

import {
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  buildFieldPermissions,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RelationshipDefinitionInMemoryRepository from '@application/repositories/relationship-definition/relationship-definition-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import RelationshipMaterializationService from '@application/services/relationship/relationship-materialization.service';
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
};

describe('Table Field Create - TEXT_LONG', () => {
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
      ),
    );

    await tableRepository.create({
      name: 'Artigos',
      slug: 'artigos',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });
  });

  it('deve criar campo com formato RICH_TEXT', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'artigos',
      name: 'Conteudo',
      type: E_FIELD_TYPE.TEXT_LONG,
      format: E_FIELD_FORMAT.RICH_TEXT,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.TEXT_LONG);
    expect(result.value.format).toBe(E_FIELD_FORMAT.RICH_TEXT);
  });

  it('deve criar campo com formato PLAIN_TEXT', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'artigos',
      name: 'Observacoes',
      type: E_FIELD_TYPE.TEXT_LONG,
      format: E_FIELD_FORMAT.PLAIN_TEXT,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.PLAIN_TEXT);
  });

  it('deve criar campo required=true', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'artigos',
      name: 'Descricao',
      type: E_FIELD_TYPE.TEXT_LONG,
      format: E_FIELD_FORMAT.RICH_TEXT,
      required: true,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.required).toBe(true);
  });

  it('deve criar campo com defaultValue', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'artigos',
      name: 'Bio',
      type: E_FIELD_TYPE.TEXT_LONG,
      format: E_FIELD_FORMAT.PLAIN_TEXT,
      defaultValue: 'Texto padrao',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.defaultValue).toBe('Texto padrao');
  });
});
