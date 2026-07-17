import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import TableRowRemoveFromTrashUseCase from './remove-from-trash.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let sut: TableRowRemoveFromTrashUseCase;

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

describe('Table Row Remove From Trash Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowInMemoryRepository = new RowInMemoryRepository();
    sut = new TableRowRemoveFromTrashUseCase(
      tableInMemoryRepository,
      rowInMemoryRepository,
    );
    vi.clearAllMocks();
  });

  it('deve remover row da lixeira com sucesso', async () => {
    const table = await tableInMemoryRepository.create(TABLE_PAYLOAD);

    const row = await rowInMemoryRepository.create({
      table,
      data: { nome: 'Test' },
    });

    await rowInMemoryRepository.update({
      table,
      _id: row._id,
      data: { trashedAt: new Date() },
    });

    const result = await sut.execute({
      slug: 'clientes',
      _id: row._id,
    });

    expect(result.isRight()).toBe(true);

    if (result.isRight()) {
      expect(result.value.trashedAt).toBeNull();
    }
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      _id: 'row-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    }
  });

  it('deve retornar erro ROW_NOT_FOUND quando registro nao existir', async () => {
    await tableInMemoryRepository.create(TABLE_PAYLOAD);

    const result = await sut.execute({
      slug: 'clientes',
      _id: 'non-existent-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('ROW_NOT_FOUND');
    }
  });

  it('deve retornar erro NOT_TRASHED quando registro nao estiver na lixeira', async () => {
    const table = await tableInMemoryRepository.create(TABLE_PAYLOAD);

    const row = await rowInMemoryRepository.create({
      table,
      data: { nome: 'Test' },
    });

    const result = await sut.execute({
      slug: 'clientes',
      _id: row._id,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(409);
      expect(result.value.cause).toBe('NOT_TRASHED');
    }
  });

  it('deve retornar erro REMOVE_ROW_FROM_TRASH_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      _id: 'row-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('REMOVE_ROW_FROM_TRASH_ERROR');
    }
  });
});
