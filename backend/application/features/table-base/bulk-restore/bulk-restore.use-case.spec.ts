import { beforeEach, describe, expect, it } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import BulkRestoreUseCase from './bulk-restore.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let sut: BulkRestoreUseCase;

describe('Bulk Restore Tables Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    sut = new BulkRestoreUseCase(tableInMemoryRepository);
  });

  it('deve restaurar multiplas tabelas da lixeira com sucesso', async () => {
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

    await tableInMemoryRepository.update({
      _id: table1._id,
      trashed: true,
      trashedAt: new Date(),
    });

    await tableInMemoryRepository.update({
      _id: table2._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ ids: [table1._id, table2._id] });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.modified).toBe(2);

    const restored1 = await tableInMemoryRepository.findById(table1._id);
    const restored2 = await tableInMemoryRepository.findById(table2._id);
    expect(restored1?.trashed).toBe(false);
    expect(restored1?.trashedAt).toBeNull();
    expect(restored2?.trashed).toBe(false);
    expect(restored2?.trashedAt).toBeNull();
  });

  it('deve retornar 0 modificados quando IDs nao existem', async () => {
    const result = await sut.execute({
      ids: ['non-existent-1', 'non-existent-2'],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.modified).toBe(0);
  });

  it('deve ignorar tabelas que nao estao na lixeira', async () => {
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

    const result = await sut.execute({ ids: [table._id] });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.modified).toBe(0);
  });

  it('deve pular tabelas cujo slug ja esta em uso por uma tabela ativa', async () => {
    // Tabela ativa ocupando o slug "clientes"
    await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    // Tabela na lixeira com o MESMO slug — não pode ser restaurada
    const trashedDup = await tableInMemoryRepository.create({
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
      _id: trashedDup._id,
      trashed: true,
      trashedAt: new Date(),
    });

    // Tabela na lixeira sem conflito — deve ser restaurada
    const trashedOk = await tableInMemoryRepository.create({
      name: 'Produtos',
      slug: 'produtos',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });
    await tableInMemoryRepository.update({
      _id: trashedOk._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ ids: [trashedDup._id, trashedOk._id] });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.modified).toBe(1);
    expect(result.value.skipped).toEqual(['clientes']);

    // A duplicata permanece na lixeira; a sem conflito foi restaurada.
    const stillTrashed = await tableInMemoryRepository.findById(
      trashedDup._id,
      {
        trashed: true,
      },
    );
    expect(stillTrashed).not.toBeNull();
    const restored = await tableInMemoryRepository.findById(trashedOk._id);
    expect(restored?.trashed).toBe(false);
  });

  it('deve retornar erro BULK_RESTORE_TABLES_ERROR quando houver falha', async () => {
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

    tableInMemoryRepository.simulateError(
      'updateMany',
      new Error('Database error'),
    );

    const result = await sut.execute({ ids: [table._id] });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('BULK_RESTORE_TABLES_ERROR');
  });
});
