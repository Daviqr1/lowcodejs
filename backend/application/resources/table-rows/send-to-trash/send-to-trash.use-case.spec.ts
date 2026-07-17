import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import TableRowSendToTrashUseCase from './send-to-trash.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let sut: TableRowSendToTrashUseCase;

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

describe('Table Row Send To Trash Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowInMemoryRepository = new RowInMemoryRepository();
    sut = new TableRowSendToTrashUseCase(
      tableInMemoryRepository,
      rowInMemoryRepository,
    );
    vi.clearAllMocks();
  });

  it('deve enviar row para lixeira com sucesso', async () => {
    const table = await tableInMemoryRepository.create(TABLE_PAYLOAD);

    const row = await rowInMemoryRepository.create({
      table,
      data: { nome: 'Test' },
    });

    const result = await sut.execute({
      slug: 'clientes',
      _id: row._id,
    });

    expect(result.isRight()).toBe(true);

    if (result.isRight()) {
      expect(result.value.trashedAt).not.toBeNull();
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

  it('deve retornar erro ALREADY_TRASHED quando registro ja estiver na lixeira', async () => {
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

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(409);
      expect(result.value.cause).toBe('ALREADY_TRASHED');
    }
  });

  it('deve retornar erro SEND_ROW_TABLE_TO_TRASH_ERROR quando houver falha', async () => {
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
      expect(result.value.cause).toBe('SEND_ROW_TABLE_TO_TRASH_ERROR');
    }
  });
});
