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
let definitionRepository: RelationshipDefinitionInMemoryRepository;
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
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
  format: null,
};

const TABLE_DEFAULTS = {
  _schema: {},
  fields: [],
  owner: 'owner-id',
  style: E_TABLE_STYLE.LIST,
  fieldOrderList: [],
  fieldOrderForm: [],
};

describe('Table Field Create - RELATIONSHIP', () => {
  beforeEach(async () => {
    tableRepository = new TableInMemoryRepository();
    fieldRepository = new FieldInMemoryRepository();
    definitionRepository = new RelationshipDefinitionInMemoryRepository();
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
        definitionRepository,
        schemaBuilder,
        modelBuilder,
      ),
    );

    await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Pedidos',
      slug: 'pedidos',
    });
    // Tabelas alvo dos relacionamentos (born-pivot exige target existente).
    for (const slug of ['produtos', 'clientes', 'fornecedores']) {
      await tableRepository.create({ ...TABLE_DEFAULTS, name: slug, slug });
    }
  });

  it('deve criar campo RELATIONSHIP e materializar o pivô (definition + espelho)', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'pedidos',
      name: 'Produtos',
      type: E_FIELD_TYPE.RELATIONSHIP,
      relationship: {
        table: { _id: '507f1f77bcf86cd799439099', slug: 'produtos' },
        field: { _id: '507f1f77bcf86cd799439088', slug: 'nome' },
        order: 'asc',
      },
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.type).toBe(E_FIELD_TYPE.RELATIONSHIP);
    expect(result.value.relationship!.table.slug).toBe('produtos');

    // Nasce pivô: relationshipId preenchido e definition criada.
    expect(result.value.relationship!.relationshipId).toBeTruthy();
    expect(definitionRepository.items).toHaveLength(1);

    // Campo-espelho criado, apontando de volta para o campo source.
    const mirror = fieldRepository.items.find(
      (f) =>
        f.type === E_FIELD_TYPE.RELATIONSHIP &&
        f.relationship?.field?._id === result.value._id,
    );
    expect(mirror).toBeDefined();
    expect(mirror!.relationship!.relationshipId).toBe(
      result.value.relationship!.relationshipId,
    );
    expect(mirror!.relationship!.visible).toBe(false);

    // `side` distingue os dois lados para a tela de detalhe chamar /links.
    expect(result.value.relationship!.side).toBe('source');
    expect(mirror!.relationship!.side).toBe('target');
  });

  it('deve criar campo RELATIONSHIP multiple=true', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'pedidos',
      name: 'Clientes',
      type: E_FIELD_TYPE.RELATIONSHIP,
      multiple: true,
      relationship: {
        table: { _id: '507f1f77bcf86cd799439099', slug: 'clientes' },
        field: { _id: '507f1f77bcf86cd799439088', slug: 'nome' },
        order: 'desc',
      },
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.multiple).toBe(true);
    expect(result.value.relationship!.order).toBe('desc');
    expect(result.value.relationship!.relationshipId).toBeTruthy();
  });

  it('deve criar campo RELATIONSHIP required=true', async () => {
    const result = await sut.execute({
      ...BASE_PAYLOAD,
      slug: 'pedidos',
      name: 'Fornecedor',
      type: E_FIELD_TYPE.RELATIONSHIP,
      required: true,
      relationship: {
        table: { _id: '507f1f77bcf86cd799439099', slug: 'fornecedores' },
        field: { _id: '507f1f77bcf86cd799439088', slug: 'razao-social' },
        order: 'asc',
      },
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.required).toBe(true);
    expect(result.value.relationship!.relationshipId).toBeTruthy();
  });
});
