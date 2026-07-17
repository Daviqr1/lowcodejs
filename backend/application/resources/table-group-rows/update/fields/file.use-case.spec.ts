import { beforeEach, describe, expect, it } from 'vitest';

import type { ITable } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import { makeFileField } from '@test/helpers/field-factory.helper';
import { groupItems, lastItemId } from '@test/helpers/row-data.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import GroupRowUpdateUseCase from '../update.use-case';

const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
const VALID_OBJECT_ID_2 = '507f1f77bcf86cd799439022';

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

describe('Group Row Update - FILE', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    sut = new GroupRowUpdateUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
    );
  });

  it('deve atualizar item com array de ObjectIds validos', async () => {
    const field = makeFileField({ slug: 'anexos' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      anexos: [VALID_OBJECT_ID],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      anexos: [VALID_OBJECT_ID_2],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.anexos).toEqual([VALID_OBJECT_ID_2]);
  });

  it('deve rejeitar quando valor nao e array', async () => {
    const field = makeFileField({ slug: 'anexos' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      anexos: [VALID_OBJECT_ID],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      anexos: VALID_OBJECT_ID,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve rejeitar quando itens nao sao ObjectIds validos', async () => {
    const field = makeFileField({ slug: 'anexos' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      anexos: [VALID_OBJECT_ID],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      anexos: ['invalid-id'],
    });

    expect(result.isLeft()).toBe(true);
  });

  it('deve permitir update parcial sem campo obrigatorio (skipMissing)', async () => {
    const anexosField = makeFileField({ slug: 'anexos', required: true });
    const fotosField = makeFileField({
      slug: 'fotos',
      name: 'Fotos',
      required: true,
    });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [anexosField, fotosField],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      anexos: [VALID_OBJECT_ID],
      fotos: [VALID_OBJECT_ID_2],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      anexos: [VALID_OBJECT_ID_2],
    });

    expect(result.isRight()).toBe(true);
  });
});
