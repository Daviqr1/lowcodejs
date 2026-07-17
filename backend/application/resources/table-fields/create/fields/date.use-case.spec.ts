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

describe('Table Field Create - DATE', () => {
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
      name: 'Eventos',
      slug: 'eventos',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });
  });

  it('deve criar campo com formato DD_MM_YYYY', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'eventos',
      name: 'Data Evento',
      type: E_FIELD_TYPE.DATE,
      format: E_FIELD_FORMAT.DD_MM_YYYY,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.DATE);
    expect(result.value.format).toBe(E_FIELD_FORMAT.DD_MM_YYYY);
  });

  it('deve criar campo com formato YYYY_MM_DD_HH_MM_SS', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'eventos',
      name: 'Inicio',
      type: E_FIELD_TYPE.DATE,
      format: E_FIELD_FORMAT.YYYY_MM_DD_HH_MM_SS,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.YYYY_MM_DD_HH_MM_SS);
  });

  it('deve criar campo com formato DD_MM_YYYY_DASH', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'eventos',
      name: 'Fim',
      type: E_FIELD_TYPE.DATE,
      format: E_FIELD_FORMAT.DD_MM_YYYY_DASH,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.format).toBe(E_FIELD_FORMAT.DD_MM_YYYY_DASH);
  });

  it('deve criar campo DATE required=true', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'eventos',
      name: 'Data Obrigatoria',
      type: E_FIELD_TYPE.DATE,
      format: E_FIELD_FORMAT.DD_MM_YYYY,
      required: true,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.required).toBe(true);
  });
});
