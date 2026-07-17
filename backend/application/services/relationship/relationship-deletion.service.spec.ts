import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_RELATIONSHIP_ON_DELETE,
  E_TABLE_STYLE,
  type ITable,
  type ValueOf,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RelationshipDefinitionInMemoryRepository from '@application/repositories/relationship-definition/relationship-definition-in-memory.repository';
import RelationshipLinkInMemoryRepository from '@application/repositories/relationship-link/relationship-link-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import RelationshipDeletionService from './relationship-deletion.service';
import RelationshipService from './relationship.service';

const FIELD_BASE = {
  permissions: buildFieldPermissions(true, true, true),
  showInFilter: false,
  locked: false,
  native: false,
  allowCreateRelationshipRecords: false,
  required: false,
  category: [],
  dropdown: [],
  defaultValue: null,
  group: null,
  format: null,
  relationship: null,
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
};

const TABLE_BASE = {
  _schema: {},
  fields: [],
  owner: 'owner-id',
  style: E_TABLE_STYLE.LIST,
  fieldOrderList: [],
  fieldOrderForm: [],
};

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let linkRepository: RelationshipLinkInMemoryRepository;
let definitionRepository: RelationshipDefinitionInMemoryRepository;
let fieldRepository: FieldInMemoryRepository;
let sut: RelationshipDeletionService;

let pedidos: ITable;
let produtos: ITable;
let sourceFieldId: string;

async function setup(
  onDelete: ValueOf<typeof E_RELATIONSHIP_ON_DELETE>,
  sourceMultiple: boolean,
  targetMultiple: boolean,
): Promise<string> {
  const sourceField = await fieldRepository.create({
    ...FIELD_BASE,
    name: 'Produtos',
    slug: 'produtos',
    type: E_FIELD_TYPE.RELATIONSHIP,
    multiple: sourceMultiple,
  });
  const targetField = await fieldRepository.create({
    ...FIELD_BASE,
    name: 'Pedido',
    slug: 'pedido',
    type: E_FIELD_TYPE.RELATIONSHIP,
    multiple: targetMultiple,
  });
  sourceFieldId = sourceField._id;

  const definition = await definitionRepository.create({
    name: 'Pedidos ↔ Produtos',
    source: {
      table: { _id: pedidos._id, slug: pedidos.slug },
      field: { _id: sourceField._id, slug: 'produtos' },
      visible: true,
      label: 'Produtos',
    },
    target: {
      table: { _id: produtos._id, slug: produtos.slug },
      field: { _id: targetField._id, slug: 'pedido' },
      visible: true,
      label: 'Pedido',
    },
    onDelete,
  });
  return definition._id;
}

async function rowExists(table: ITable, _id: string): Promise<boolean> {
  const row = await rowRepository.findOne({ table, query: { _id } });
  return row !== null;
}

describe('RelationshipDeletionService', () => {
  beforeEach(async () => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    linkRepository = new RelationshipLinkInMemoryRepository();
    definitionRepository = new RelationshipDefinitionInMemoryRepository();
    fieldRepository = new FieldInMemoryRepository();
    sut = new RelationshipDeletionService(
      new RelationshipService(linkRepository, fieldRepository),
      definitionRepository,
      linkRepository,
      fieldRepository,
      tableRepository,
      rowRepository,
    );

    pedidos = await tableRepository.create({
      ...TABLE_BASE,
      name: 'Pedidos',
      slug: 'pedidos',
    });
    produtos = await tableRepository.create({
      ...TABLE_BASE,
      name: 'Produtos',
      slug: 'produtos',
    });
  });

  it('RESTRICT bloqueia a exclusao do pai quando ha filho com FK', async () => {
    // 1:N — pai pedidos (REVERSE), filho produtos com FK `pedido`.
    await setup(E_RELATIONSHIP_ON_DELETE.RESTRICT, true, false);
    await rowRepository.create({
      table: produtos,
      data: { nome: 'Cafe', pedido: 'ped1' },
    });

    const result = await sut.applyOnDelete(pedidos, 'ped1');

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('RELATIONSHIP_DELETE_RESTRICT');
    expect(result.value.code).toBe(409);
  });

  it('RESTRICT bloqueia a exclusao do filho quando a FK esta setada', async () => {
    await setup(E_RELATIONSHIP_ON_DELETE.RESTRICT, true, false);
    const prod = await rowRepository.create({
      table: produtos,
      data: { nome: 'Cafe', pedido: 'ped1' },
    });

    const result = await sut.applyOnDelete(produtos, prod._id);

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('RELATIONSHIP_DELETE_RESTRICT');
  });

  it('SET_NULL orfana a FK dos filhos, sem apagar registros', async () => {
    await setup(E_RELATIONSHIP_ON_DELETE.SET_NULL, true, false);
    const prod = await rowRepository.create({
      table: produtos,
      data: { nome: 'Cafe', pedido: 'ped1' },
    });

    const result = await sut.applyOnDelete(pedidos, 'ped1');

    expect(result.isRight()).toBe(true);
    expect(await rowExists(produtos, prod._id)).toBe(true);
    const child = await rowRepository.findOne({
      table: produtos,
      query: { _id: prod._id },
    });
    expect(child?.pedido).toBeNull();
  });

  it('CASCADE apagando o pai (REVERSE) remove os filhos por FK', async () => {
    await setup(E_RELATIONSHIP_ON_DELETE.CASCADE, true, false);
    const prod1 = await rowRepository.create({
      table: produtos,
      data: { nome: 'Cafe', pedido: 'ped1' },
    });
    const prod2 = await rowRepository.create({
      table: produtos,
      data: { nome: 'Leite', pedido: 'ped1' },
    });
    const outro = await rowRepository.create({
      table: produtos,
      data: { nome: 'Cha', pedido: 'ped2' },
    });

    const result = await sut.applyOnDelete(pedidos, 'ped1');

    expect(result.isRight()).toBe(true);
    expect(await rowExists(produtos, prod1._id)).toBe(false);
    expect(await rowExists(produtos, prod2._id)).toBe(false);
    // Filho de outro pai nao e tocado.
    expect(await rowExists(produtos, outro._id)).toBe(true);
  });

  it('CASCADE apagando o filho (OWNS_FK) nao sobe pro pai', async () => {
    await setup(E_RELATIONSHIP_ON_DELETE.CASCADE, true, false);
    const ped = await rowRepository.create({
      table: pedidos,
      data: { nome: 'Pedido 1' },
    });
    const prod = await rowRepository.create({
      table: produtos,
      data: { nome: 'Cafe', pedido: ped._id },
    });

    const result = await sut.applyOnDelete(produtos, prod._id);

    expect(result.isRight()).toBe(true);
    expect(await rowExists(pedidos, ped._id)).toBe(true);
  });

  it('N:N CASCADE remove apenas os links do registro', async () => {
    const relationshipId = await setup(
      E_RELATIONSHIP_ON_DELETE.CASCADE,
      true,
      true,
    );
    const prod = await rowRepository.create({
      table: produtos,
      data: { nome: 'Cafe' },
    });
    await linkRepository.create({
      relationshipId,
      sourceId: 'ped1',
      targetId: prod._id,
    });

    const result = await sut.applyOnDelete(pedidos, 'ped1');

    expect(result.isRight()).toBe(true);
    expect(await rowExists(produtos, prod._id)).toBe(true);
    expect(await linkRepository.countByRecord(relationshipId, 'ped1')).toBe(0);
  });

  it('auto-relacionamento CASCADE nao entra em loop infinito', async () => {
    // Hierarquia na mesma tabela: pai (multiple) -> filhos (single).
    const sourceField = await fieldRepository.create({
      ...FIELD_BASE,
      name: 'Filhos',
      slug: 'filhos',
      type: E_FIELD_TYPE.RELATIONSHIP,
      multiple: true,
    });
    const targetField = await fieldRepository.create({
      ...FIELD_BASE,
      name: 'Pai',
      slug: 'pai',
      type: E_FIELD_TYPE.RELATIONSHIP,
      multiple: false,
    });
    const definition = await definitionRepository.create({
      name: 'Hierarquia',
      source: {
        table: { _id: pedidos._id, slug: pedidos.slug },
        field: { _id: sourceField._id, slug: 'filhos' },
        visible: true,
        label: 'Filhos',
      },
      target: {
        table: { _id: pedidos._id, slug: pedidos.slug },
        field: { _id: targetField._id, slug: 'pai' },
        visible: true,
        label: 'Pai',
      },
      onDelete: E_RELATIONSHIP_ON_DELETE.CASCADE,
    });

    const filho = await rowRepository.create({
      table: pedidos,
      data: { nome: 'Filho' },
    });
    // Ciclo artificial de FK: pai aponta pro filho e filho aponta pro pai.
    const pai = await rowRepository.create({
      table: pedidos,
      data: { nome: 'Pai', pai: filho._id },
    });
    await rowRepository.update({
      table: pedidos,
      _id: filho._id,
      data: { pai: pai._id },
    });

    const result = await sut.applyOnDelete(pedidos, pai._id);

    expect(result.isRight()).toBe(true);
    expect(await rowExists(pedidos, filho._id)).toBe(false);
    // Guard de visitados impede loop infinito (sem timeout/stack overflow).
    expect(definition._id).toBeTruthy();
  });

  it('cleanupTable remove definitions e links e quarentena mirror de outras tabelas', async () => {
    const relationshipId = await setup(
      E_RELATIONSHIP_ON_DELETE.SET_NULL,
      true,
      false,
    );
    await linkRepository.create({
      relationshipId,
      sourceId: 'ped1',
      targetId: 'prod1',
    });

    await sut.cleanupTable(produtos._id);

    expect(await definitionRepository.findById(relationshipId)).toBeNull();
    expect(linkRepository.items).toHaveLength(0);

    // sourceField é o mirror em pedidos (tabela sobrevivente) — deve ser quarentenado
    const mirror = fieldRepository.items.find((f) => f._id === sourceFieldId);
    expect(mirror?.trashed).toBe(true);
  });

  it('cleanupTable em auto-relacionamento remove links e definition sem espelho a limpar', async () => {
    // source e target são a mesma tabela (pedidos): ambos os campos saem no
    // deleteMany da exclusão da tabela; cleanupTable só zera links + definition.
    const filhos = await fieldRepository.create({
      ...FIELD_BASE,
      name: 'Filhos',
      slug: 'filhos',
      type: E_FIELD_TYPE.RELATIONSHIP,
      multiple: true,
    });
    const pai = await fieldRepository.create({
      ...FIELD_BASE,
      name: 'Pai',
      slug: 'pai',
      type: E_FIELD_TYPE.RELATIONSHIP,
      multiple: false,
    });
    const definition = await definitionRepository.create({
      name: 'Hierarquia',
      source: {
        table: { _id: pedidos._id, slug: pedidos.slug },
        field: { _id: filhos._id, slug: 'filhos' },
        visible: true,
        label: 'Filhos',
      },
      target: {
        table: { _id: pedidos._id, slug: pedidos.slug },
        field: { _id: pai._id, slug: 'pai' },
        visible: true,
        label: 'Pai',
      },
      onDelete: E_RELATIONSHIP_ON_DELETE.SET_NULL,
    });
    await linkRepository.create({
      relationshipId: definition._id,
      sourceId: 'row1',
      targetId: 'row2',
    });

    await sut.cleanupTable(pedidos._id);

    expect(await definitionRepository.findById(definition._id)).toBeNull();
    expect(linkRepository.items).toHaveLength(0);
  });
});
