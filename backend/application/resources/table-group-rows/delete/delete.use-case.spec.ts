import { beforeEach, describe, expect, it } from 'vitest';

import type { ITable } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import RowOwnershipService from '@application/services/row-ownership/row-ownership.service';
import TableGroupService from '@application/services/table-group/table-group.service';
import { makeTextShortField } from '@test/helpers/field-factory.helper';
import { groupItems } from '@test/helpers/row-data.helper';
import {
  makeTable,
  makeTableWithGroup,
} from '@test/helpers/table-factory.helper';

import GroupRowDeleteUseCase from './delete.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let sut: GroupRowDeleteUseCase;

const createTableWithGroup = (): Promise<ITable> =>
  makeTableWithGroup(
    tableRepository,
    'items',
    [makeTextShortField({ _id: 'gf-1', name: 'Descricao', slug: 'descricao' })],
    [],
    { name: 'Pedidos', slug: 'pedidos' },
  );

async function createRowWithItems(table: ITable): Promise<{
  rowId: string;
  itemId: string;
}> {
  const row = await rowRepository.create({
    table,
    data: {
      items: [
        { _id: 'item-1', descricao: 'Item A' },
        { _id: 'item-2', descricao: 'Item B' },
      ],
    },
  });
  return { rowId: row._id, itemId: 'item-1' };
}

describe('Group Row Delete Use Case', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    sut = new GroupRowDeleteUseCase(
      tableRepository,
      rowRepository,
      new InMemoryRowAccessGuardService(),
      new RowOwnershipService(),
      new TableGroupService(tableRepository),
    );
  });

  it('deve deletar item do grupo com sucesso', async () => {
    const table = await createTableWithGroup();
    const { rowId, itemId } = await createRowWithItems(table);

    const result = await sut.execute({
      slug: 'pedidos',
      rowId,
      groupSlug: 'items',
      itemId,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value).toBeNull();

    const updatedRow = await rowRepository.findOne({
      table,
      query: { _id: rowId },
    });
    const items = groupItems(updatedRow ?? {}, 'items');
    expect(items.find((item) => item._id === itemId)).toBeUndefined();
  });

  it('deve retornar TABLE_NOT_FOUND quando tabela nao existe', async () => {
    const result = await sut.execute({
      slug: 'inexistente',
      rowId: 'row-1',
      groupSlug: 'items',
      itemId: 'item-1',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    expect(result.value.message).toBe('Tabela não encontrada');
  });

  it('deve retornar GROUP_NOT_FOUND quando grupo nao existe', async () => {
    await makeTable(tableRepository, [], {
      name: 'Pedidos',
      slug: 'pedidos',
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: 'row-1',
      groupSlug: 'inexistente',
      itemId: 'item-1',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('GROUP_NOT_FOUND');
    expect(result.value.message).toBe('Grupo não encontrado');
  });

  it('deve retornar ROW_NOT_FOUND quando row nao existe', async () => {
    await createTableWithGroup();

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: 'row-inexistente',
      groupSlug: 'items',
      itemId: 'item-1',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('ROW_NOT_FOUND');
    expect(result.value.message).toBe('Registro não encontrado');
  });

  it('deve retornar ITEM_NOT_FOUND quando item nao existe', async () => {
    const table = await createTableWithGroup();
    const { rowId } = await createRowWithItems(table);

    const result = await sut.execute({
      slug: 'pedidos',
      rowId,
      groupSlug: 'items',
      itemId: 'item-inexistente',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('ITEM_NOT_FOUND');
    expect(result.value.message).toBe('Item não encontrado');
  });

  it('deve retornar DELETE_GROUP_ROW_ERROR quando repository falha', async () => {
    tableRepository.simulateError('findBySlug', new Error('Database error'));

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: 'row-1',
      groupSlug: 'items',
      itemId: 'item-1',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('DELETE_GROUP_ROW_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
