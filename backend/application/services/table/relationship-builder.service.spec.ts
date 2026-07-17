import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_RELATIONSHIP_ON_DELETE,
  type IField,
  type IRelationshipDefinition,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RelationshipDefinitionInMemoryRepository from '@application/repositories/relationship-definition/relationship-definition-in-memory.repository';
import RelationshipLinkInMemoryRepository from '@application/repositories/relationship-link/relationship-link-in-memory.repository';
import RelationshipService from '@application/services/relationship/relationship.service';

import type { RelationshipHydratableDoc } from './relationship-builder-contract.service';
import MongooseRelationshipBuilder from './relationship-builder.service';

const PEDIDO_TABLE = { _id: 'table-pedido', slug: 'pedidos' };
const PRODUTO_TABLE = { _id: 'table-produto', slug: 'produtos' };

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
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
};

// Doc minimo que captura as chamadas de set() para asserts de hydrate.
class FakeDoc implements RelationshipHydratableDoc {
  _id: { toString(): string };
  sets: Record<string, unknown> = {};

  constructor(id: string) {
    this._id = { toString: (): string => id };
  }

  set(path: string, value: unknown): void {
    this.sets[path] = value;
  }
}

let linkRepository: RelationshipLinkInMemoryRepository;
let definitionRepository: RelationshipDefinitionInMemoryRepository;
let fieldRepository: FieldInMemoryRepository;
let service: RelationshipService;
let sut: MongooseRelationshipBuilder;

// Campo do lado source (pedidos→produtos), gerido por links.
let sourceField: IField;

describe('MongooseRelationshipBuilder', () => {
  beforeEach(async () => {
    linkRepository = new RelationshipLinkInMemoryRepository();
    definitionRepository = new RelationshipDefinitionInMemoryRepository();
    fieldRepository = new FieldInMemoryRepository();
    service = new RelationshipService(linkRepository, fieldRepository);
    sut = new MongooseRelationshipBuilder(
      service,
      definitionRepository,
      fieldRepository,
      linkRepository,
    );

    // 1:N — source (pedidos) aceita multiplos; target (produtos) nao.
    sourceField = await fieldRepository.create({
      ...FIELD_BASE,
      name: 'Produtos',
      slug: 'produtos',
      type: E_FIELD_TYPE.RELATIONSHIP,
      multiple: true,
      relationship: {
        table: PRODUTO_TABLE,
        field: { _id: 'field-mirror', slug: 'pedidos' },
        order: 'asc',
      },
    });

    const mirrorField = await fieldRepository.create({
      ...FIELD_BASE,
      name: 'Pedidos',
      slug: 'pedidos',
      type: E_FIELD_TYPE.RELATIONSHIP,
      multiple: false,
      relationship: {
        table: PEDIDO_TABLE,
        field: { _id: sourceField._id, slug: 'produtos' },
        order: 'asc',
      },
    });

    const definition = await definitionRepository.create({
      name: 'Pedidos ↔ Produtos',
      source: {
        table: PEDIDO_TABLE,
        field: { _id: sourceField._id, slug: 'produtos' },
        visible: true,
        label: 'Produtos',
      },
      target: {
        table: PRODUTO_TABLE,
        field: { _id: mirrorField._id, slug: 'pedidos' },
        visible: true,
        label: 'Pedidos',
      },
      onDelete: E_RELATIONSHIP_ON_DELETE.RESTRICT,
    });

    // Back-pointer do campo source para a definition (fonte de verdade).
    sourceField.relationship = {
      ...sourceField.relationship,
      table: PRODUTO_TABLE,
      field: { _id: mirrorField._id, slug: 'pedidos' },
      order: 'asc',
      relationshipId: definition._id,
    };
  });

  it('extract separa campos RELATIONSHIP geridos por links do payload', () => {
    const result = sut.extract([sourceField], {
      nome: 'Pedido 1',
      produtos: ['p1', 'p2'],
    });

    expect(result.data).toEqual({ nome: 'Pedido 1' });
    expect(result.pending).toHaveLength(1);
    expect(result.pending[0].ids).toEqual(['p1', 'p2']);
  });

  it('persist cria os links do conjunto desejado', async () => {
    await sut.persist([sourceField], 'ped1', [
      { field: sourceField, ids: ['p1', 'p2'] },
    ]);

    const links = await linkRepository.findBySource(
      sourceField.relationship!.relationshipId!,
      'ped1',
    );
    expect(links.map((l) => l.targetId)).toEqual(['p1', 'p2']);
  });

  it('persist reconcilia removendo ids que sairam do conjunto', async () => {
    const relationshipId = sourceField.relationship!.relationshipId!;

    await sut.persist([sourceField], 'ped1', [
      { field: sourceField, ids: ['p1', 'p2'] },
    ]);
    await sut.persist([sourceField], 'ped1', [
      { field: sourceField, ids: ['p1'] },
    ]);

    const links = await linkRepository.findBySource(relationshipId, 'ped1');
    expect(links.map((l) => l.targetId)).toEqual(['p1']);
  });

  it('persist lanca HTTPException ao violar limite do lado nao-multiplo', async () => {
    // produto p1 nao aceita multiplos pedidos (target multiple=false).
    await sut.persist([sourceField], 'ped1', [
      { field: sourceField, ids: ['p1'] },
    ]);

    await expect(
      sut.persist([sourceField], 'ped2', [{ field: sourceField, ids: ['p1'] }]),
    ).rejects.toBeInstanceOf(HTTPException);
  });

  it('hydrate projeta os ids dos links em doc[slug]', async () => {
    await sut.persist([sourceField], 'ped1', [
      { field: sourceField, ids: ['p1', 'p2'] },
    ]);

    const doc = new FakeDoc('ped1');
    await sut.hydrate([sourceField], [doc]);

    expect(doc.sets['produtos']).toEqual(['p1', 'p2']);
  });

  it('hydrate projeta vazio em campo gerido sem links (links sao a fonte de verdade)', async () => {
    const doc = new FakeDoc('ped1');
    await sut.hydrate([sourceField], [doc]);

    // Campo gerido: 0 links => [] (nao cai no embedded legado stale).
    expect(doc.sets['produtos']).toEqual([]);
  });

  it('hydrate zera campo RELATIONSHIP sem relationshipId (zero legado, nunca serve embedded)', async () => {
    const legacy: IField = {
      ...sourceField,
      relationship: {
        table: PRODUTO_TABLE,
        field: { _id: 'field-mirror', slug: 'pedidos' },
        order: 'asc',
        relationshipId: null,
      },
    };
    const doc = new FakeDoc('ped1');
    await sut.hydrate([legacy], [doc]);

    // Sem relationshipId: zera o path (não cai no array embedded legado).
    expect(doc.sets['produtos']).toEqual([]);
  });

  describe('OWNS_FK (FK single na propria row)', () => {
    let ownsField: IField;

    beforeEach(async () => {
      // 1:1 — source dono da FK (multiple=false dos dois lados).
      ownsField = await fieldRepository.create({
        ...FIELD_BASE,
        name: 'Produto',
        slug: 'produto',
        type: E_FIELD_TYPE.RELATIONSHIP,
        multiple: false,
        relationship: {
          table: PRODUTO_TABLE,
          field: { _id: 'field-mirror-owns', slug: 'pedido' },
          order: 'asc',
          relationshipId: 'rel-owns',
          side: 'source',
          mirror: { multiple: false, visible: true },
        },
      });
    });

    it('extract coage [id] -> id single no payload (sem pending)', () => {
      const result = sut.extract([ownsField], {
        nome: 'Pedido',
        produto: ['p1'],
      });

      expect(result.data).toEqual({ nome: 'Pedido', produto: 'p1' });
      expect(result.pending).toHaveLength(0);
    });

    it('extract coage vazio -> null', () => {
      const result = sut.extract([ownsField], { produto: [] });
      expect(result.data).toEqual({ produto: null });
      expect(result.pending).toHaveLength(0);
    });

    it('hydrate nao toca o path OWNS_FK (FK ja na row; populate resolve)', async () => {
      const doc = new FakeDoc('ped1');
      await sut.hydrate([ownsField], [doc]);
      expect('produto' in doc.sets).toBe(false);
    });

    it('normalizeReadProjection embrulha FK single em array', () => {
      const single = { produto: { _id: 'p1' } };
      sut.normalizeReadProjection([ownsField], single);
      expect(single.produto).toEqual([{ _id: 'p1' }]);

      const empty: Record<string, unknown> = { produto: null };
      sut.normalizeReadProjection([ownsField], empty);
      expect(empty.produto).toEqual([]);

      const already = { produto: [{ _id: 'p1' }] };
      sut.normalizeReadProjection([ownsField], already);
      expect(already.produto).toEqual([{ _id: 'p1' }]);
    });

    it('normalizeReadProjection nao toca campos REVERSE/PIVOT/legado', () => {
      const row = { produtos: [{ _id: 'p1' }] };
      sut.normalizeReadProjection([sourceField], row);
      expect(row.produtos).toEqual([{ _id: 'p1' }]);
    });

    it('resolveRelationshipFilter devolve null (FK na propria row; filtra direto)', async () => {
      const fragment = await sut.resolveRelationshipFilter(ownsField, ['p1']);
      expect(fragment).toBeNull();
    });
  });

  describe('resolveRelationshipFilter (PIVOT via links)', () => {
    let pivotField: IField;

    beforeEach(async () => {
      // N:N — os dois lados aceitam multiplos => PIVOT.
      pivotField = await fieldRepository.create({
        ...FIELD_BASE,
        name: 'Tags',
        slug: 'tags',
        type: E_FIELD_TYPE.RELATIONSHIP,
        multiple: true,
        relationship: {
          table: PRODUTO_TABLE,
          field: { _id: 'field-mirror-tags', slug: 'pedidos' },
          order: 'asc',
          relationshipId: 'rel-nn',
          side: 'source',
          mirror: { multiple: true, visible: true },
        },
      });

      // ped1 -> [t1, t2] ; ped2 -> [t1]
      await linkRepository.create({
        relationshipId: 'rel-nn',
        sourceId: 'ped1',
        targetId: 't1',
      });
      await linkRepository.create({
        relationshipId: 'rel-nn',
        sourceId: 'ped1',
        targetId: 't2',
      });
      await linkRepository.create({
        relationshipId: 'rel-nn',
        sourceId: 'ped2',
        targetId: 't1',
      });
    });

    it('resolve os ids deste lado cujos vinculos tocam os selecionados', async () => {
      const fragment = await sut.resolveRelationshipFilter(pivotField, ['t1']);
      expect(fragment).toEqual({ _id: { $in: ['ped1', 'ped2'] } });
    });

    it('deduplica e segue OR (qualquer um dos selecionados)', async () => {
      const fragment = await sut.resolveRelationshipFilter(pivotField, [
        't1',
        't2',
      ]);
      expect(fragment).toEqual({ _id: { $in: ['ped1', 'ped2'] } });
    });

    it('selecao vazia => match em nada', async () => {
      const fragment = await sut.resolveRelationshipFilter(pivotField, []);
      expect(fragment).toEqual({ _id: { $in: [] } });
    });

    it('sem side (legado) => null (caller filtra direto)', async () => {
      const legacy: IField = {
        ...pivotField,
        relationship: {
          table: PRODUTO_TABLE,
          field: { _id: 'field-mirror-tags', slug: 'pedidos' },
          order: 'asc',
          relationshipId: 'rel-nn',
        },
      };
      const fragment = await sut.resolveRelationshipFilter(legacy, ['t1']);
      expect(fragment).toBeNull();
    });
  });

  describe('RelationshipService.resolveOwningIds', () => {
    beforeEach(async () => {
      await linkRepository.create({
        relationshipId: 'rel-x',
        sourceId: 'a1',
        targetId: 'b1',
      });
      await linkRepository.create({
        relationshipId: 'rel-x',
        sourceId: 'a2',
        targetId: 'b1',
      });
      await linkRepository.create({
        relationshipId: 'rel-x',
        sourceId: 'a1',
        targetId: 'b2',
      });
    });

    it('side source: resolve sources cujos targets caem na selecao', async () => {
      const ids = await service.resolveOwningIds('rel-x', 'source', ['b1']);
      expect(ids).toEqual(['a1', 'a2']);
    });

    it('side target: resolve targets cujos sources caem na selecao', async () => {
      const ids = await service.resolveOwningIds('rel-x', 'target', ['a1']);
      expect(ids).toEqual(['b1', 'b2']);
    });

    it('selecao vazia => vazio', async () => {
      const ids = await service.resolveOwningIds('rel-x', 'source', []);
      expect(ids).toEqual([]);
    });
  });

  describe('ensureUnlinkKeepsRequired (FK)', () => {
    // 1:N — o dono da FK é o lado não-múltiplo (target/produtos). Tornar o dono
    // obrigatório barra o unlink antes de tocar o banco (retorno antecipado).
    async function setupOwnerRequired(
      ownerRequired: boolean,
    ): Promise<{ definition: IRelationshipDefinition }> {
      const source = await fieldRepository.create({
        ...FIELD_BASE,
        name: 'Produtos',
        slug: 'produtos',
        type: E_FIELD_TYPE.RELATIONSHIP,
        multiple: true,
        relationship: {
          table: PRODUTO_TABLE,
          field: PEDIDO_TABLE,
          order: 'asc',
        },
      });
      const owner = await fieldRepository.create({
        ...FIELD_BASE,
        name: 'Pedidos',
        slug: 'pedidos',
        type: E_FIELD_TYPE.RELATIONSHIP,
        multiple: false,
        required: ownerRequired,
        relationship: {
          table: PEDIDO_TABLE,
          field: PRODUTO_TABLE,
          order: 'asc',
        },
      });
      const definition = await definitionRepository.create({
        name: 'Pedidos ↔ Produtos',
        source: {
          table: PEDIDO_TABLE,
          field: { _id: source._id, slug: 'produtos' },
          visible: true,
          label: 'Produtos',
        },
        target: {
          table: PRODUTO_TABLE,
          field: { _id: owner._id, slug: 'pedidos' },
          visible: true,
          label: 'Pedidos',
        },
        onDelete: E_RELATIONSHIP_ON_DELETE.RESTRICT,
      });
      return { definition };
    }

    it('bloqueia quando o dono da FK é obrigatório', async () => {
      const { definition } = await setupOwnerRequired(true);
      const result = await sut.ensureUnlinkKeepsRequired(definition, 'row-1');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft())
        expect(result.value.cause).toBe('RELATIONSHIP_REQUIRED');
    });

    it('permite quando nenhum lado é obrigatório', async () => {
      const { definition } = await setupOwnerRequired(false);
      const result = await sut.ensureUnlinkKeepsRequired(definition, 'row-1');
      expect(result.isRight()).toBe(true);
    });
  });

  it('hasManagedRelationships é true para qualquer campo RELATIONSHIP (links são a única fonte)', () => {
    const legacy: IField = {
      ...sourceField,
      relationship: {
        table: PRODUTO_TABLE,
        field: { _id: 'field-mirror', slug: 'pedidos' },
        order: 'asc',
        relationshipId: null,
      },
    };
    expect(sut.hasManagedRelationships([legacy])).toBe(true);
    expect(sut.hasManagedRelationships([sourceField])).toBe(true);
  });
});
