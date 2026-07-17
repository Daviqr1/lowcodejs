import { beforeEach, describe, expect, it } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import TableShowUseCase from './show.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let sut: TableShowUseCase;

describe('Table Show Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    sut = new TableShowUseCase(tableInMemoryRepository);
  });

  it('deve retornar tabela existente pelo slug', async () => {
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

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.name).toBe('Clientes');
    expect(result.value.slug).toBe('clientes');
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({ slug: 'non-existent' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    expect(result.value.message).toBe('Tabela não encontrada');
  });

  it('deve retornar erro GET_TABLE_BY_SLUG_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({ slug: 'some-slug' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('GET_TABLE_BY_SLUG_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
