import { beforeEach, describe, expect, it } from 'vitest';

import { E_TABLE_STYLE, E_TABLE_TYPE } from '@application/core/entity.core';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import TablePaginatedUseCase from './paginated.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let sut: TablePaginatedUseCase;

describe('Table Paginated Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    sut = new TablePaginatedUseCase(tableInMemoryRepository);
  });

  it('deve retornar lista vazia quando nao houver tabelas', async () => {
    const result = await sut.execute({
      page: 1,
      perPage: 20,
      trashed: 'false',
      'order-created-at': 'asc',
      'order-link': 'asc',
      'order-name': 'asc',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.data).toHaveLength(0);
    expect(result.value.meta.total).toBe(0);
  });

  it('deve retornar lista de tabelas paginada', async () => {
    await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      type: E_TABLE_TYPE.TABLE,
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    await tableInMemoryRepository.create({
      name: 'Produtos',
      slug: 'produtos',
      _schema: {},
      fields: [],
      type: E_TABLE_TYPE.TABLE,
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      page: 1,
      perPage: 20,
      trashed: 'false',
      'order-created-at': 'asc',
      'order-link': 'asc',
      'order-name': 'asc',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.data).toHaveLength(2);
    expect(result.value.meta.total).toBe(2);
  });

  it('deve retornar metadata de paginacao correto', async () => {
    for (let i = 1; i <= 25; i++) {
      await tableInMemoryRepository.create({
        name: `Tabela ${i}`,
        slug: `tabela-${i}`,
        _schema: {},
        fields: [],
        type: E_TABLE_TYPE.TABLE,
        owner: 'owner-id',
        style: E_TABLE_STYLE.LIST,
        fieldOrderList: [],
        fieldOrderForm: [],
      });
    }

    const result = await sut.execute({
      page: 1,
      perPage: 10,
      trashed: 'false',
      'order-created-at': 'asc',
      'order-link': 'asc',
      'order-name': 'asc',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.data).toHaveLength(10);
    expect(result.value.meta.total).toBe(25);
    expect(result.value.meta.lastPage).toBe(3);
    expect(result.value.meta.firstPage).toBe(1);
  });

  it('deve filtrar por busca', async () => {
    await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      type: E_TABLE_TYPE.TABLE,
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    await tableInMemoryRepository.create({
      name: 'Produtos',
      slug: 'produtos',
      _schema: {},
      fields: [],
      type: E_TABLE_TYPE.TABLE,
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      page: 1,
      perPage: 20,
      trashed: 'false',
      search: 'Clientes',
      'order-created-at': 'asc',
      'order-link': 'asc',
      'order-name': 'asc',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.data).toHaveLength(1);
    expect(result.value.data[0].name).toBe('Clientes');
  });

  it('deve retornar erro TABLE_LIST_PAGINATED_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findMany',
      new Error('Database error'),
    );

    const result = await sut.execute({
      page: 1,
      perPage: 20,
      trashed: 'false',
      'order-created-at': 'asc',
      'order-link': 'asc',
      'order-name': 'asc',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('TABLE_LIST_PAGINATED_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
