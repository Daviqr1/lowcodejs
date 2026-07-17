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
  defaultValue: null,
  group: null,
  multiple: false,
  relationship: null,
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
  format: null,
};

describe('Table Field Create - DROPDOWN', () => {
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

  it('deve criar campo DROPDOWN com opcoes', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'tarefas',
      name: 'Status',
      type: E_FIELD_TYPE.DROPDOWN,
      dropdown: [
        { id: '1', label: 'Ativo' },
        { id: '2', label: 'Inativo' },
      ],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.DROPDOWN);
    expect(result.value.dropdown).toHaveLength(2);
    expect(result.value.dropdown[0].label).toBe('Ativo');
  });

  it('deve criar campo DROPDOWN com cores nas opcoes', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'tarefas',
      name: 'Prioridade',
      type: E_FIELD_TYPE.DROPDOWN,
      dropdown: [
        { id: '1', label: 'Alta', color: '#ff0000' },
        { id: '2', label: 'Media', color: '#ffaa00' },
        { id: '3', label: 'Baixa', color: '#00ff00' },
      ],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.dropdown[0].color).toBe('#ff0000');
    expect(result.value.dropdown[2].color).toBe('#00ff00');
  });

  it('deve criar campo DROPDOWN required=true', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'tarefas',
      name: 'Tipo',
      type: E_FIELD_TYPE.DROPDOWN,
      dropdown: [{ id: '1', label: 'Bug' }],
      required: true,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.required).toBe(true);
  });

  it('deve criar campo DROPDOWN permitindo novas tags', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'tarefas',
      name: 'Marcadores',
      type: E_FIELD_TYPE.DROPDOWN,
      dropdown: [{ id: '1', label: 'Cliente' }],
      allowCustomDropdownOptions: true,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.allowCustomDropdownOptions).toBe(true);
  });

  it('deve rejeitar campo DROPDOWN com opcoes duplicadas por nome', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'tarefas',
      name: 'Status duplicado',
      type: E_FIELD_TYPE.DROPDOWN,
      dropdown: [
        { id: '1', label: 'Ativo' },
        { id: '2', label: ' ativo ' },
      ],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('DROPDOWN_OPTION_ALREADY_EXISTS');
  });
});
