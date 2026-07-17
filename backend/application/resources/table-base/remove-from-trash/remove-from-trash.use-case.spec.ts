import { beforeEach, describe, expect, it } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import TableRemoveFromTrashUseCase from './remove-from-trash.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let sut: TableRemoveFromTrashUseCase;

describe('Table Remove From Trash Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    sut = new TableRemoveFromTrashUseCase(tableInMemoryRepository);
  });

  it('deve remover tabela da lixeira com sucesso', async () => {
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

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.trashed).toBe(false);
    expect(result.value.trashedAt).toBeNull();
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({ slug: 'non-existent' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    expect(result.value.message).toBe('Tabela não encontrada');
  });

  it('deve retornar erro NOT_TRASHED quando tabela nao estiver na lixeira', async () => {
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

    const result = await sut.execute({ slug: 'clientes' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('NOT_TRASHED');
    expect(result.value.message).toBe('Tabela não está na lixeira');
  });

  it('deve retornar erro SLUG_ALREADY_ACTIVE quando ja existe uma tabela ativa com o mesmo slug', async () => {
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

    // Tabela na lixeira com o MESMO slug
    const trashed = await tableInMemoryRepository.create({
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
      _id: trashed._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ slug: 'clientes' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('SLUG_ALREADY_ACTIVE');
  });

  it('deve retornar erro REMOVE_TABLE_FROM_TRASH_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({ slug: 'some-slug' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('REMOVE_TABLE_FROM_TRASH_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
