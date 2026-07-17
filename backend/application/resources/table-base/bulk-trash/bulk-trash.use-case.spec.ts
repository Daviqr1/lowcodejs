import { beforeEach, describe, expect, it } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import BulkTrashUseCase from './bulk-trash.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let sut: BulkTrashUseCase;

describe('Bulk Trash Tables Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    sut = new BulkTrashUseCase(tableInMemoryRepository);
  });

  it('deve enviar multiplas tabelas para lixeira com sucesso', async () => {
    const table1 = await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const table2 = await tableInMemoryRepository.create({
      name: 'Produtos',
      slug: 'produtos',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({ ids: [table1._id, table2._id] });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.modified).toBe(2);

    const trashed1 = await tableInMemoryRepository.findById(table1._id);
    const trashed2 = await tableInMemoryRepository.findById(table2._id);
    expect(trashed1?.trashed).toBe(true);
    expect(trashed1?.trashedAt).toBeInstanceOf(Date);
    expect(trashed2?.trashed).toBe(true);
    expect(trashed2?.trashedAt).toBeInstanceOf(Date);
  });

  it('deve retornar 0 modificados quando IDs nao existem', async () => {
    const result = await sut.execute({
      ids: ['non-existent-1', 'non-existent-2'],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.modified).toBe(0);
  });

  it('deve ignorar tabelas ja na lixeira', async () => {
    const table = await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    await tableInMemoryRepository.update({
      _id: table._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ ids: [table._id] });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.modified).toBe(0);
  });

  it('deve retornar erro BULK_TRASH_TABLES_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'updateMany',
      new Error('Database error'),
    );

    const result = await sut.execute({ ids: ['some-id'] });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('BULK_TRASH_TABLES_ERROR');
  });
});
