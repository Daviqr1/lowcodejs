import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import EmptyTrashUseCase from './empty-trash.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let sut: EmptyTrashUseCase;

const TABLE_PAYLOAD = {
  name: 'Clientes',
  slug: 'clientes',
  _schema: {},
  fields: [],
  owner: 'owner-id',
  style: E_TABLE_STYLE.LIST,
  fieldOrderList: [],
  fieldOrderForm: [],
};

describe('Empty Trash Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowInMemoryRepository = new RowInMemoryRepository();
    sut = new EmptyTrashUseCase(tableInMemoryRepository, rowInMemoryRepository);
    vi.clearAllMocks();
  });

  it('deve esvaziar lixeira da tabela com sucesso', async () => {
    const table = await tableInMemoryRepository.create(TABLE_PAYLOAD);

    const row1 = await rowInMemoryRepository.create({
      table,
      data: { nome: 'Cliente 1' },
    });
    const row2 = await rowInMemoryRepository.create({
      table,
      data: { nome: 'Cliente 2' },
    });
    await rowInMemoryRepository.create({
      table,
      data: { nome: 'Cliente 3' },
    });

    await rowInMemoryRepository.update({
      table,
      _id: row1._id,
      data: { trashed: true, trashedAt: new Date() },
    });
    await rowInMemoryRepository.update({
      table,
      _id: row2._id,
      data: { trashed: true, trashedAt: new Date() },
    });

    const result = await sut.execute({ slug: 'clientes' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.deleted).toBe(2);

    const remaining1 = await rowInMemoryRepository.findOne({
      table,
      query: { _id: row1._id },
    });
    const remaining2 = await rowInMemoryRepository.findOne({
      table,
      query: { _id: row2._id },
    });
    expect(remaining1).toBeNull();
    expect(remaining2).toBeNull();
  });

  it('deve retornar TABLE_NOT_FOUND quando tabela nao existe', async () => {
    const result = await sut.execute({ slug: 'non-existent' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
  });

  it('deve retornar deleted: 0 quando lixeira vazia', async () => {
    const table = await tableInMemoryRepository.create(TABLE_PAYLOAD);

    await rowInMemoryRepository.create({
      table,
      data: { nome: 'Cliente 1' },
    });

    const result = await sut.execute({ slug: 'clientes' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.deleted).toBe(0);
  });

  it('deve retornar EMPTY_TRASH_ROW_ERROR quando repository falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({ slug: 'clientes' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('EMPTY_TRASH_ROWS_ERROR');
  });
});
