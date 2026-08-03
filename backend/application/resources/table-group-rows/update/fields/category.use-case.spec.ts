import { beforeEach, describe, expect, it } from 'vitest';

import type { ITable } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import { makeCategoryField } from '@test/helpers/field-factory.helper';
import { groupItems, lastItemId } from '@test/helpers/row-data.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import GroupRowUpdateUseCase from '../update.use-case';

const CATEGORIES = [
  { id: '1', label: 'Tecnologia', children: [] },
  {
    id: '2',
    label: 'Saude',
    children: [{ id: '2.1', label: 'Medicina', children: [] }],
  },
];

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let sut: GroupRowUpdateUseCase;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function createRowWithGroupItem(
  table: ITable,
  groupSlug: string,
  itemData: Record<string, unknown>,
) {
  const row = await rowRepository.create({
    table,
    data: { [groupSlug]: [] },
  });

  const rowWithItem = await rowRepository.addGroupItem({
    table,
    rowId: row._id,
    groupFieldSlug: groupSlug,
    data: itemData,
  });

  const items = groupItems(rowWithItem, groupSlug);
  const itemId = lastItemId(items);

  return { row, rowWithItem, itemId };
}

describe('Group Row Update - CATEGORY', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    sut = new GroupRowUpdateUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
      new InMemoryRowAccessGuardService(),
    );
  });

  it('deve atualizar item com array de strings valido', async () => {
    const field = makeCategoryField(CATEGORIES, { slug: 'categorias' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      categorias: ['1'],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      categorias: ['2', '2.1'],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.categorias).toEqual(['2', '2.1']);
  });

  it('deve rejeitar quando valor nao e array', async () => {
    const field = makeCategoryField(CATEGORIES, { slug: 'categorias' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      categorias: ['1'],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      categorias: 'Tecnologia',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve rejeitar quando itens nao sao strings', async () => {
    const field = makeCategoryField(CATEGORIES, { slug: 'categorias' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      categorias: ['1'],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      categorias: [123, 456],
    });

    expect(result.isLeft()).toBe(true);
  });

  it('deve permitir update parcial sem campo obrigatorio (skipMissing)', async () => {
    const categoriasField = makeCategoryField(CATEGORIES, {
      slug: 'categorias',
      required: true,
    });
    const tagsField = makeCategoryField(
      [{ id: '1', label: 'Tag1', children: [] }],
      { slug: 'tags', required: true },
    );
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [categoriasField, tagsField],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      categorias: ['1'],
      tags: ['1'],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      categorias: ['2'],
    });

    expect(result.isRight()).toBe(true);
  });
});
