import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';

import BulkTrashUseCase from './bulk-trash.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let sut: BulkTrashUseCase;

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

describe('Bulk Trash Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowInMemoryRepository = new RowInMemoryRepository();
    sut = new BulkTrashUseCase(
      tableInMemoryRepository,
      rowInMemoryRepository,
      new InMemoryRowAccessGuardService(),
    );
    vi.clearAllMocks();
  });

  it('deve enviar multiplos registros para lixeira com sucesso', async () => {
    const table = await tableInMemoryRepository.create(TABLE_PAYLOAD);

    const row1 = await rowInMemoryRepository.create({
      table,
      data: { nome: 'Cliente 1' },
    });
    const row2 = await rowInMemoryRepository.create({
      table,
      data: { nome: 'Cliente 2' },
    });
    const row3 = await rowInMemoryRepository.create({
      table,
      data: { nome: 'Cliente 3' },
    });

    const result = await sut.execute({
      slug: 'clientes',
      ids: [row1._id, row2._id, row3._id],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.modified).toBe(3);

    const trashed1 = await rowInMemoryRepository.findOne({
      table,
      query: { _id: row1._id },
    });
    const trashed2 = await rowInMemoryRepository.findOne({
      table,
      query: { _id: row2._id },
    });
    const trashed3 = await rowInMemoryRepository.findOne({
      table,
      query: { _id: row3._id },
    });
    expect(trashed1?.trashedAt).not.toBeNull();
    expect(trashed2?.trashedAt).not.toBeNull();
    expect(trashed3?.trashedAt).not.toBeNull();
  });

  it('deve retornar TABLE_NOT_FOUND quando tabela nao existe', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      ids: ['id-1', 'id-2'],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
  });

  it('deve retornar modified: 0 quando nenhum registro encontrado', async () => {
    await tableInMemoryRepository.create(TABLE_PAYLOAD);

    const result = await sut.execute({
      slug: 'clientes',
      ids: ['non-existent-id-1', 'non-existent-id-2'],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.modified).toBe(0);
  });

  it('deve retornar BULK_TRASH_ROW_ERROR quando repository falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'clientes',
      ids: ['id-1'],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('BULK_TRASH_ROWS_ERROR');
  });
});
