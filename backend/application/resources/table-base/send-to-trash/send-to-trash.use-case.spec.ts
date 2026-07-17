import { beforeEach, describe, expect, it } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import TableSendToTrashUseCase from './send-to-trash.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let sut: TableSendToTrashUseCase;

describe('Table Send To Trash Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    sut = new TableSendToTrashUseCase(tableInMemoryRepository);
  });

  it('deve enviar tabela para lixeira com sucesso', async () => {
    const created = await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({ slug: 'clientes' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const trashed = await tableInMemoryRepository.findById(created._id);
    expect(trashed?.trashed).toBe(true);
    expect(trashed?.trashedAt).not.toBeNull();
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({ slug: 'non-existent' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    expect(result.value.message).toBe('Tabela não encontrada');
  });

  it('deve retornar erro ALREADY_TRASHED quando tabela ja estiver na lixeira', async () => {
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

    const result = await sut.execute({ slug: 'clientes' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('ALREADY_TRASHED');
    expect(result.value.message).toBe('Tabela já está na lixeira');
  });

  it('deve retornar erro SEND_TABLE_TO_TRASH_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({ slug: 'some-slug' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('SEND_TABLE_TO_TRASH_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
