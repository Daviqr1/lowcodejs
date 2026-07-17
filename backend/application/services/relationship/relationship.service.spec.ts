import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_RELATIONSHIP_CARDINALITY,
  E_RELATIONSHIP_ON_DELETE,
  E_RELATIONSHIP_STORAGE,
  type IRelationshipDefinition,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RelationshipLinkInMemoryRepository from '@application/repositories/relationship-link/relationship-link-in-memory.repository';

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

function makeDefinition(): IRelationshipDefinition {
  return {
    _id: 'rel-1',
    name: 'A ↔ B',
    source: {
      table: { _id: 'table-a', slug: 'table-a' },
      field: { _id: 'field-a', slug: 'field-a' },
      visible: true,
      label: 'B',
    },
    target: {
      table: { _id: 'table-b', slug: 'table-b' },
      field: { _id: 'field-b', slug: 'field-b' },
      visible: false,
      label: 'A',
    },
    onDelete: E_RELATIONSHIP_ON_DELETE.RESTRICT,
    createdAt: new Date(),
    updatedAt: new Date(),
    trashed: false,
    trashedAt: null,
  };
}

describe('RelationshipService', () => {
  let links: RelationshipLinkInMemoryRepository;
  let fields: FieldInMemoryRepository;
  let service: RelationshipService;
  let definition: IRelationshipDefinition;

  beforeEach(() => {
    links = new RelationshipLinkInMemoryRepository();
    fields = new FieldInMemoryRepository();
    service = new RelationshipService(links, fields);
    definition = makeDefinition();
  });

  describe('cardinalityOf', () => {
    it('deriva 1:1 quando nenhum lado aceita multiplos', () => {
      const result = service.cardinalityOf(
        { multiple: false },
        { multiple: false },
      );
      expect(result).toBe(E_RELATIONSHIP_CARDINALITY.ONE_TO_ONE);
    });

    it('deriva 1:N quando apenas um lado aceita multiplos', () => {
      expect(
        service.cardinalityOf({ multiple: true }, { multiple: false }),
      ).toBe(E_RELATIONSHIP_CARDINALITY.ONE_TO_MANY);
      expect(
        service.cardinalityOf({ multiple: false }, { multiple: true }),
      ).toBe(E_RELATIONSHIP_CARDINALITY.ONE_TO_MANY);
    });

    it('deriva N:N quando os dois lados aceitam multiplos', () => {
      const result = service.cardinalityOf(
        { multiple: true },
        { multiple: true },
      );
      expect(result).toBe(E_RELATIONSHIP_CARDINALITY.MANY_TO_MANY);
    });
  });

  describe('storageRoleOf', () => {
    it('1:1 — source e dono da FK (OWNS_FK), target e reverso (REVERSE)', () => {
      expect(
        service.storageRoleOf(
          'source',
          { multiple: false },
          { multiple: false },
        ),
      ).toBe(E_RELATIONSHIP_STORAGE.OWNS_FK);
      expect(
        service.storageRoleOf(
          'target',
          { multiple: false },
          { multiple: false },
        ),
      ).toBe(E_RELATIONSHIP_STORAGE.REVERSE);
    });

    it('1:N — o lado nao-multiplo e OWNS_FK; o multiplo e REVERSE', () => {
      // source multiplo, target nao: target dono.
      expect(
        service.storageRoleOf(
          'target',
          { multiple: true },
          { multiple: false },
        ),
      ).toBe(E_RELATIONSHIP_STORAGE.OWNS_FK);
      expect(
        service.storageRoleOf(
          'source',
          { multiple: true },
          { multiple: false },
        ),
      ).toBe(E_RELATIONSHIP_STORAGE.REVERSE);
      // source nao-multiplo, target multiplo: source dono.
      expect(
        service.storageRoleOf(
          'source',
          { multiple: false },
          { multiple: true },
        ),
      ).toBe(E_RELATIONSHIP_STORAGE.OWNS_FK);
      expect(
        service.storageRoleOf(
          'target',
          { multiple: false },
          { multiple: true },
        ),
      ).toBe(E_RELATIONSHIP_STORAGE.REVERSE);
    });

    it('N:N — ambos os lados sao PIVOT', () => {
      expect(
        service.storageRoleOf('source', { multiple: true }, { multiple: true }),
      ).toBe(E_RELATIONSHIP_STORAGE.PIVOT);
      expect(
        service.storageRoleOf('target', { multiple: true }, { multiple: true }),
      ).toBe(E_RELATIONSHIP_STORAGE.PIVOT);
    });
  });

  describe('ownerOf', () => {
    it('1:1 — dono e o endpoint source', () => {
      const owner = service.ownerOf(
        definition,
        { multiple: false },
        { multiple: false },
      );
      expect(owner).toEqual({
        side: 'source',
        tableId: 'table-a',
        tableSlug: 'table-a',
        fieldSlug: 'field-a',
      });
    });

    it('1:N — dono e o endpoint do lado nao-multiplo', () => {
      const owner = service.ownerOf(
        definition,
        { multiple: true },
        { multiple: false },
      );
      expect(owner).toEqual({
        side: 'target',
        tableId: 'table-b',
        tableSlug: 'table-b',
        fieldSlug: 'field-b',
      });
    });

    it('N:N — sem dono single (pivo)', () => {
      const owner = service.ownerOf(
        definition,
        { multiple: true },
        { multiple: true },
      );
      expect(owner).toBeNull();
    });
  });

  describe('canLink', () => {
    it('rejeita auto-vinculo trivial (sourceId === targetId)', async () => {
      const result = await service.canLink({
        definition,
        sourceField: { multiple: true, relationship: null },
        targetField: { multiple: true, relationship: null },
        sourceId: 'x',
        targetId: 'x',
      });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft())
        expect(result.value.cause).toBe('RELATIONSHIP_SELF_LINK');
    });

    it('rejeita par duplicado', async () => {
      await links.create({
        relationshipId: 'rel-1',
        sourceId: 'a',
        targetId: 'b',
      });
      const result = await service.canLink({
        definition,
        sourceField: { multiple: true, relationship: null },
        targetField: { multiple: true, relationship: null },
        sourceId: 'a',
        targetId: 'b',
      });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft())
        expect(result.value.cause).toBe('RELATIONSHIP_LINK_DUPLICATE');
    });

    it('rejeita 2o vinculo quando o lado source nao aceita multiplos', async () => {
      await links.create({
        relationshipId: 'rel-1',
        sourceId: 'a',
        targetId: 'b',
      });
      const result = await service.canLink({
        definition,
        sourceField: { multiple: false, relationship: null },
        targetField: { multiple: true, relationship: null },
        sourceId: 'a',
        targetId: 'c',
      });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft())
        expect(result.value.cause).toBe('RELATIONSHIP_SOURCE_LIMIT');
    });

    it('rejeita 2o vinculo quando o lado target nao aceita multiplos', async () => {
      await links.create({
        relationshipId: 'rel-1',
        sourceId: 'a',
        targetId: 'b',
      });
      const result = await service.canLink({
        definition,
        sourceField: { multiple: true, relationship: null },
        targetField: { multiple: false, relationship: null },
        sourceId: 'c',
        targetId: 'b',
      });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft())
        expect(result.value.cause).toBe('RELATIONSHIP_TARGET_LIMIT');
    });

    it('aceita vinculo valido em N:N', async () => {
      const result = await service.canLink({
        definition,
        sourceField: { multiple: true, relationship: null },
        targetField: { multiple: true, relationship: null },
        sourceId: 'a',
        targetId: 'b',
      });
      expect(result.isRight()).toBe(true);
    });

    describe('cardinalidade numérica (max)', () => {
      it('rejeita quando source atingiu o max', async () => {
        await links.create({
          relationshipId: 'rel-1',
          sourceId: 'src1',
          targetId: 't1',
        });
        await links.create({
          relationshipId: 'rel-1',
          sourceId: 'src1',
          targetId: 't2',
        });
        await links.create({
          relationshipId: 'rel-1',
          sourceId: 'src1',
          targetId: 't3',
        });

        const result = await service.canLink({
          definition,
          sourceField: {
            multiple: true,
            relationship: {
              table: { _id: 'tid', slug: 'stub' },
              field: { _id: 'fid', slug: 'stub' },
              order: 'asc',
              max: 3,
            },
          },
          targetField: { multiple: true, relationship: null },
          sourceId: 'src1',
          targetId: 't4',
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft())
          expect(result.value.cause).toBe('RELATIONSHIP_SOURCE_MAX');
      });

      it('permite quando abaixo do max', async () => {
        await links.create({
          relationshipId: 'rel-1',
          sourceId: 'src2',
          targetId: 't1',
        });

        const result = await service.canLink({
          definition,
          sourceField: {
            multiple: true,
            relationship: {
              table: { _id: 'tid', slug: 'stub' },
              field: { _id: 'fid', slug: 'stub' },
              order: 'asc',
              max: 3,
            },
          },
          targetField: { multiple: true, relationship: null },
          sourceId: 'src2',
          targetId: 't2',
        });

        expect(result.isRight()).toBe(true);
      });

      it('rejeita quando target atingiu o max', async () => {
        await links.create({
          relationshipId: 'rel-1',
          sourceId: 's1',
          targetId: 'tgt1',
        });

        const result = await service.canLink({
          definition,
          sourceField: { multiple: true, relationship: null },
          targetField: {
            multiple: true,
            relationship: {
              table: { _id: 'tid', slug: 'stub' },
              field: { _id: 'fid', slug: 'stub' },
              order: 'asc',
              max: 1,
            },
          },
          sourceId: 's2',
          targetId: 'tgt1',
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft())
          expect(result.value.cause).toBe('RELATIONSHIP_TARGET_MAX');
      });

      it('ignora max quando relationship e null (sem limite)', async () => {
        await links.create({
          relationshipId: 'rel-1',
          sourceId: 'srcX',
          targetId: 't1',
        });
        await links.create({
          relationshipId: 'rel-1',
          sourceId: 'srcX',
          targetId: 't2',
        });

        const result = await service.canLink({
          definition,
          sourceField: { multiple: true, relationship: null },
          targetField: { multiple: true, relationship: null },
          sourceId: 'srcX',
          targetId: 't3',
        });

        expect(result.isRight()).toBe(true);
      });
    });
  });

  describe('link / unlink', () => {
    it('cria vinculo apendando order na lista do source', async () => {
      const first = await service.link({
        definition,
        sourceField: { multiple: true, relationship: null },
        targetField: { multiple: true, relationship: null },
        sourceId: 'a',
        targetId: 'b',
      });
      const second = await service.link({
        definition,
        sourceField: { multiple: true, relationship: null },
        targetField: { multiple: true, relationship: null },
        sourceId: 'a',
        targetId: 'c',
      });

      expect(first.isRight()).toBe(true);
      expect(second.isRight()).toBe(true);
      if (first.isRight()) expect(first.value.order).toBe(0);
      if (second.isRight()) expect(second.value.order).toBe(1);
    });

    it('remove vinculo existente', async () => {
      const created = await links.create({
        relationshipId: 'rel-1',
        sourceId: 'a',
        targetId: 'b',
      });
      const result = await service.unlink(created._id);
      expect(result.isRight()).toBe(true);
      expect(await links.findById(created._id)).toBeNull();
    });

    it('retorna erro ao desvincular id inexistente', async () => {
      const result = await service.unlink('missing');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft())
        expect(result.value.cause).toBe('RELATIONSHIP_LINK_NOT_FOUND');
    });
  });

  describe('ensureUnlinkKeepsRequired (pivot)', () => {
    async function setupRequired(
      sourceRequired: boolean,
      targetRequired: boolean,
    ): Promise<void> {
      const sourceField = await fields.create({
        ...FIELD_BASE,
        name: 'A',
        slug: 'a',
        type: E_FIELD_TYPE.RELATIONSHIP,
        multiple: true,
        required: sourceRequired,
      });
      const targetField = await fields.create({
        ...FIELD_BASE,
        name: 'B',
        slug: 'b',
        type: E_FIELD_TYPE.RELATIONSHIP,
        multiple: true,
        required: targetRequired,
      });
      definition.source.field._id = sourceField._id;
      definition.target.field._id = targetField._id;
    }

    it('bloqueia ao remover o último vínculo de um lado obrigatório', async () => {
      await setupRequired(true, false);
      const link = await links.create({
        relationshipId: 'rel-1',
        sourceId: 'a',
        targetId: 'b',
      });
      const result = await service.ensureUnlinkKeepsRequired(
        definition,
        link._id,
      );
      expect(result.isLeft()).toBe(true);
      if (result.isLeft())
        expect(result.value.cause).toBe('RELATIONSHIP_REQUIRED');
    });

    it('permite quando o lado obrigatório ainda mantém outro vínculo', async () => {
      await setupRequired(true, false);
      const link = await links.create({
        relationshipId: 'rel-1',
        sourceId: 'a',
        targetId: 'b',
      });
      await links.create({
        relationshipId: 'rel-1',
        sourceId: 'a',
        targetId: 'c',
      });
      const result = await service.ensureUnlinkKeepsRequired(
        definition,
        link._id,
      );
      expect(result.isRight()).toBe(true);
    });

    it('permite quando nenhum lado é obrigatório', async () => {
      await setupRequired(false, false);
      const link = await links.create({
        relationshipId: 'rel-1',
        sourceId: 'a',
        targetId: 'b',
      });
      const result = await service.ensureUnlinkKeepsRequired(
        definition,
        link._id,
      );
      expect(result.isRight()).toBe(true);
    });
  });

  describe('resolveLinkedIds', () => {
    beforeEach(async () => {
      await links.create({
        relationshipId: 'rel-1',
        sourceId: 'a',
        targetId: 'b',
      });
      await links.create({
        relationshipId: 'rel-1',
        sourceId: 'a',
        targetId: 'c',
      });
      await links.create({
        relationshipId: 'rel-1',
        sourceId: 'd',
        targetId: 'b',
      });
    });

    it('le pelo lado source retornando os targetIds', async () => {
      const ids = await service.resolveLinkedIds(definition, 'a', 'source');
      expect(ids).toEqual(['b', 'c']);
    });

    it('le pelo lado target retornando os sourceIds', async () => {
      const ids = await service.resolveLinkedIds(definition, 'b', 'target');
      expect(ids).toEqual(['a', 'd']);
    });
  });

  describe('isPivot', () => {
    async function setup(
      sourceMultiple: boolean,
      targetMultiple: boolean,
    ): Promise<IRelationshipDefinition> {
      const sourceField = await fields.create({
        ...FIELD_BASE,
        name: 'A',
        slug: 'a',
        type: E_FIELD_TYPE.RELATIONSHIP,
        multiple: sourceMultiple,
      });
      const targetField = await fields.create({
        ...FIELD_BASE,
        name: 'B',
        slug: 'b',
        type: E_FIELD_TYPE.RELATIONSHIP,
        multiple: targetMultiple,
      });
      const def = makeDefinition();
      def.source.field._id = sourceField._id;
      def.target.field._id = targetField._id;
      return def;
    }

    it('true em N:N (os dois lados multiplos)', async () => {
      expect(await service.isPivot(await setup(true, true))).toBe(true);
    });

    it('false em 1:1', async () => {
      expect(await service.isPivot(await setup(false, false))).toBe(false);
    });

    it('false em 1:N', async () => {
      expect(await service.isPivot(await setup(true, false))).toBe(false);
    });
  });
});
