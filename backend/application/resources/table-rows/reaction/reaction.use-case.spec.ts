import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_REACTION_TYPE, E_TABLE_STYLE } from '@application/core/entity.core';
import ReactionInMemoryRepository from '@application/repositories/reaction/reaction-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryRowContextBuilder from '@application/services/table/in-memory-row-context-builder.service';

import TableRowReactionUseCase from './reaction.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let reactionInMemoryRepository: ReactionInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let rowContextBuilder: InMemoryRowContextBuilder;
let sut: TableRowReactionUseCase;

describe('Table Row Reaction Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    reactionInMemoryRepository = new ReactionInMemoryRepository();
    rowInMemoryRepository = new RowInMemoryRepository();
    rowContextBuilder = new InMemoryRowContextBuilder();

    sut = new TableRowReactionUseCase(
      tableInMemoryRepository,
      reactionInMemoryRepository,
      rowInMemoryRepository,
      rowContextBuilder,
    );
    vi.clearAllMocks();
  });

  it('deve adicionar reacao com sucesso', async () => {
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

    const row = await rowInMemoryRepository.create({
      table,
      data: { likes: [] },
    });

    const result = await sut.execute({
      slug: 'clientes',
      _id: row._id,
      field: 'likes',
      type: E_REACTION_TYPE.LIKE,
      user: 'user-id',
    });

    expect(result.isRight()).toBe(true);
  });

  it('deve atualizar reacao existente', async () => {
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

    const reaction = await reactionInMemoryRepository.create({
      type: E_REACTION_TYPE.LIKE,
      user: 'user-id',
    });

    const row = await rowInMemoryRepository.create({
      table,
      data: { likes: [reaction._id] },
    });

    const result = await sut.execute({
      slug: 'clientes',
      _id: row._id,
      field: 'likes',
      type: E_REACTION_TYPE.UNLIKE,
      user: 'user-id',
    });

    expect(result.isRight()).toBe(true);
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      _id: 'row-id',
      field: 'likes',
      type: E_REACTION_TYPE.LIKE,
      user: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    }
  });

  it('deve retornar erro REACTION_ROW_TABLE_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      _id: 'row-id',
      field: 'likes',
      type: E_REACTION_TYPE.LIKE,
      user: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('REACTION_ROW_TABLE_ERROR');
    }
  });
});
