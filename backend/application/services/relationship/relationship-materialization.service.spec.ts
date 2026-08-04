import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_RELATIONSHIP_ON_DELETE,
  E_TABLE_STYLE,
  type IField,
  type ITable,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RelationshipDefinitionInMemoryRepository from '@application/repositories/relationship-definition/relationship-definition-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import SlugService from '@application/services/slug/slug.service';
import InMemoryModelBuilder from '@application/services/table/in-memory-model-builder.service';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';

import RelationshipMaterializationService from './relationship-materialization.service';

const TABLE_DEFAULTS = {
  _schema: {},
  fields: [],
  owner: 'owner-id',
  style: E_TABLE_STYLE.LIST,
  fieldOrderList: [],
  fieldOrderForm: [],
};

let fieldRepository: FieldInMemoryRepository;
let tableRepository: TableInMemoryRepository;
let definitionRepository: RelationshipDefinitionInMemoryRepository;
let sut: RelationshipMaterializationService;

let pedidos: ITable;
let produtos: ITable;

async function createSourceField(multiple: boolean): Promise<IField> {
  return fieldRepository.create({
    name: 'Produtos',
    slug: 'produtos',
    type: E_FIELD_TYPE.RELATIONSHIP,
    required: false,
    multiple,
    format: null,
    showInFilter: false,
    permissions: buildFieldPermissions(true, true, true),
    widthInForm: 50,
    widthInList: 10,
    widthInDetail: null,
    tip: null,
    locked: false,
    native: false,
    defaultValue: null,
    relationship: {
      table: { _id: produtos._id, slug: produtos.slug },
      field: { _id: 'field-nome', slug: 'nome' },
      order: 'asc',
    },
    dropdown: [],
    allowCustomDropdownOptions: false,
    allowCreateRelationshipRecords: false,
    category: [],
    group: null,
  });
}

describe('RelationshipMaterializationService', () => {
  beforeEach(async () => {
    fieldRepository = new FieldInMemoryRepository();
    tableRepository = new TableInMemoryRepository();
    definitionRepository = new RelationshipDefinitionInMemoryRepository();
    sut = new RelationshipMaterializationService(
      fieldRepository,
      tableRepository,
      definitionRepository,
      new InMemorySchemaBuilder(),
      new InMemoryModelBuilder(),
      new SlugService(),
    );

    pedidos = await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Pedidos',
      slug: 'pedidos',
    });
    produtos = await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Produtos',
      slug: 'produtos',
    });
  });

  it('cria definition + espelho e liga os dois lados', async () => {
    const source = await createSourceField(true);

    const result = await sut.materialize({
      sourceField: source,
      sourceTable: pedidos,
      onDelete: E_RELATIONSHIP_ON_DELETE.SET_NULL,
      mirrorMultiple: false,
      mirrorVisible: false,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    // Definition criada com os dois endpoints e onDelete.
    expect(definitionRepository.items).toHaveLength(1);
    const definition = definitionRepository.items[0];
    expect(definition.source.field._id).toBe(source._id);
    expect(definition.onDelete).toBe(E_RELATIONSHIP_ON_DELETE.SET_NULL);
    expect(result.value.definitionId).toBe(definition._id);

    // Source ligado à definition; onDelete denormalizado no campo.
    const updatedSource = await fieldRepository.findById(source._id);
    expect(updatedSource!.relationship!.relationshipId).toBe(definition._id);
    expect(updatedSource!.relationship!.visible).toBe(true);
    expect(updatedSource!.relationship!.onDelete).toBe(
      E_RELATIONSHIP_ON_DELETE.SET_NULL,
    );

    // Espelho criado no target, ligado, visible:false e com onDelete.
    const mirror = await fieldRepository.findById(result.value.mirrorFieldId);
    expect(mirror).not.toBeNull();
    expect(mirror!.relationship!.relationshipId).toBe(definition._id);
    expect(mirror!.relationship!.visible).toBe(false);
    expect(mirror!.relationship!.onDelete).toBe(
      E_RELATIONSHIP_ON_DELETE.SET_NULL,
    );
    expect(mirror!.relationship!.table.slug).toBe('pedidos');
    expect(mirror!.multiple).toBe(false);
  });

  it('dedup: re-materializar o mesmo campo source não cria definition duplicada', async () => {
    const source = await createSourceField(true);

    const first = await sut.materialize({
      sourceField: source,
      sourceTable: pedidos,
      onDelete: E_RELATIONSHIP_ON_DELETE.SET_NULL,
      mirrorMultiple: false,
      mirrorVisible: false,
    });
    if (!first.isRight()) throw new Error('Expected right');

    // Simula o gap das migrations 15/23 / double-submit: re-materializa com o
    // objeto `source` STALE (sem relationshipId religado). A guarda deve achar a
    // definition existente por source.field._id e reusá-la.
    const second = await sut.materialize({
      sourceField: source,
      sourceTable: pedidos,
      onDelete: E_RELATIONSHIP_ON_DELETE.SET_NULL,
      mirrorMultiple: false,
      mirrorVisible: false,
    });

    expect(second.isRight()).toBe(true);
    if (!second.isRight()) throw new Error('Expected right');

    // Continua só 1 definition e 1 espelho — sem duplicar.
    const active = definitionRepository.items.filter((d) => !d.trashed);
    expect(active).toHaveLength(1);
    expect(second.value.definitionId).toBe(first.value.definitionId);
    expect(second.value.mirrorFieldId).toBe(first.value.mirrorFieldId);
  });

  it('falha quando a tabela alvo não existe', async () => {
    const source = await fieldRepository.create({
      name: 'Inexistente',
      slug: 'inexistente',
      type: E_FIELD_TYPE.RELATIONSHIP,
      required: false,
      multiple: false,
      format: null,
      showInFilter: false,
      permissions: buildFieldPermissions(true, true, true),
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      tip: null,
      locked: false,
      native: false,
      defaultValue: null,
      relationship: {
        table: { _id: 'missing-id', slug: 'missing-slug' },
        field: { _id: 'x', slug: 'x' },
        order: 'asc',
      },
      dropdown: [],
      allowCustomDropdownOptions: false,
      allowCreateRelationshipRecords: false,
      category: [],
      group: null,
    });

    const result = await sut.materialize({
      sourceField: source,
      sourceTable: pedidos,
      onDelete: E_RELATIONSHIP_ON_DELETE.SET_NULL,
      mirrorMultiple: false,
      mirrorVisible: false,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('RELATIONSHIP_TARGET_NOT_FOUND');
  });

  it('syncConfig atualiza onDelete e cardinalidade do espelho', async () => {
    const source = await createSourceField(true);
    const materialized = await sut.materialize({
      sourceField: source,
      sourceTable: pedidos,
      onDelete: E_RELATIONSHIP_ON_DELETE.SET_NULL,
      mirrorMultiple: false,
      mirrorVisible: false,
    });
    if (!materialized.isRight()) throw new Error('Expected right');

    // Recarrega o source já com relationshipId.
    const linked = await fieldRepository.findById(source._id);

    const synced = await sut.syncConfig({
      sourceField: linked!,
      onDelete: E_RELATIONSHIP_ON_DELETE.CASCADE,
      sourceVisible: true,
      sourceLabel: 'Produtos',
      mirrorMultiple: true,
      mirrorVisible: true,
    });

    expect(synced.isRight()).toBe(true);
    const definition = definitionRepository.items[0];
    expect(definition.onDelete).toBe(E_RELATIONSHIP_ON_DELETE.CASCADE);
    expect(definition.target.visible).toBe(true);

    // onDelete denormalizado é re-sincronizado nos dois campos.
    const resyncedSource = await fieldRepository.findById(source._id);
    expect(resyncedSource!.relationship!.onDelete).toBe(
      E_RELATIONSHIP_ON_DELETE.CASCADE,
    );

    const mirror = await fieldRepository.findById(
      materialized.value.mirrorFieldId,
    );
    expect(mirror!.multiple).toBe(true);
    expect(mirror!.relationship!.visible).toBe(true);
    expect(mirror!.relationship!.onDelete).toBe(
      E_RELATIONSHIP_ON_DELETE.CASCADE,
    );
  });

  it('auto-relacionamento: target == source materializa na mesma tabela', async () => {
    const selfField = await fieldRepository.create({
      name: 'Pai',
      slug: 'pai',
      type: E_FIELD_TYPE.RELATIONSHIP,
      required: false,
      multiple: false,
      format: null,
      showInFilter: false,
      permissions: buildFieldPermissions(true, true, true),
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      tip: null,
      locked: false,
      native: false,
      defaultValue: null,
      relationship: {
        table: { _id: pedidos._id, slug: pedidos.slug },
        field: { _id: 'x', slug: 'x' },
        order: 'asc',
      },
      dropdown: [],
      allowCustomDropdownOptions: false,
      allowCreateRelationshipRecords: false,
      category: [],
      group: null,
    });

    const result = await sut.materialize({
      sourceField: selfField,
      sourceTable: pedidos,
      onDelete: E_RELATIONSHIP_ON_DELETE.CASCADE,
      mirrorMultiple: true,
      mirrorVisible: false,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    const definition = definitionRepository.items[0];
    expect(definition.source.table.slug).toBe('pedidos');
    expect(definition.target.table.slug).toBe('pedidos');
  });
});
