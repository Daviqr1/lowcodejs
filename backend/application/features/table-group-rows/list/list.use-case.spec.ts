import { beforeEach, describe, expect, it } from 'vitest';

import type { ITable } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import TableGroupService from '@application/services/table-group/table-group.service';
import TypeGuardService from '@application/services/type-guard/type-guard.service';
import { makeTextShortField } from '@test/helpers/field-factory.helper';
import {
  makeTable,
  makeTableWithGroup,
} from '@test/helpers/table-factory.helper';

import GroupRowListUseCase from './list.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let sut: GroupRowListUseCase;

const createTableWithGroup = (): Promise<ITable> =>
  makeTableWithGroup(
    tableRepository,
    'items',
    [makeTextShortField({ _id: 'gf-1', name: 'Descricao', slug: 'descricao' })],
    [],
    { name: 'Pedidos', slug: 'pedidos' },
  );

async function createRowWithItems(
  table: ITable,
  items: Record<string, unknown>[] = [
    { _id: 'item-1', descricao: 'Item A' },
    { _id: 'item-2', descricao: 'Item B' },
  ],
): Promise<string> {
  const row = await rowRepository.create({
    table,
    data: { items },
  });
  return row._id;
}

describe('Group Row List Use Case', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    sut = new GroupRowListUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
      new InMemoryRowAccessGuardService(),
      new TypeGuardService(),
      new TableGroupService(tableRepository),
    );
  });

  it('deve listar itens do grupo', async () => {
    const table = await createTableWithGroup();
    const rowId = await createRowWithItems(table);

    const result = await sut.execute({
      slug: 'pedidos',
      rowId,
      groupSlug: 'items',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const items = result.value;
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveProperty('descricao', 'Item A');
    expect(items[1]).toHaveProperty('descricao', 'Item B');
  });

  it('deve retornar array vazio quando grupo nao tem itens', async () => {
    const table = await createTableWithGroup();
    const rowId = await createRowWithItems(table, []);

    const result = await sut.execute({
      slug: 'pedidos',
      rowId,
      groupSlug: 'items',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value).toHaveLength(0);
  });

  it('deve retornar TABLE_NOT_FOUND quando tabela nao existe', async () => {
    const result = await sut.execute({
      slug: 'inexistente',
      rowId: 'row-1',
      groupSlug: 'items',
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
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('ROW_NOT_FOUND');
    expect(result.value.message).toBe('Registro não encontrado');
  });
});
