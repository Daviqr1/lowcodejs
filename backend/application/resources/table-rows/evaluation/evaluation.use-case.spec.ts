import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import EvaluationInMemoryRepository from '@application/repositories/evaluation/evaluation-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryRowContextBuilder from '@application/services/table/in-memory-row-context-builder.service';

import TableRowEvaluationUseCase from './evaluation.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let evaluationInMemoryRepository: EvaluationInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let rowContextBuilder: InMemoryRowContextBuilder;
let sut: TableRowEvaluationUseCase;

describe('Table Row Evaluation Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    evaluationInMemoryRepository = new EvaluationInMemoryRepository();
    rowInMemoryRepository = new RowInMemoryRepository();
    rowContextBuilder = new InMemoryRowContextBuilder();

    sut = new TableRowEvaluationUseCase(
      tableInMemoryRepository,
      evaluationInMemoryRepository,
      rowInMemoryRepository,
      rowContextBuilder,
    );
    vi.clearAllMocks();
  });

  it('deve adicionar avaliacao com sucesso', async () => {
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
      data: { ratings: [] },
    });

    const result = await sut.execute({
      slug: 'clientes',
      _id: row._id,
      field: 'ratings',
      value: 5,
      user: 'user-id',
    });

    expect(result.isRight()).toBe(true);
  });

  it('deve atualizar avaliacao existente', async () => {
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

    const evaluation = await evaluationInMemoryRepository.create({
      value: 3,
      user: 'user-id',
    });

    const row = await rowInMemoryRepository.create({
      table,
      data: { ratings: [evaluation._id] },
    });

    const result = await sut.execute({
      slug: 'clientes',
      _id: row._id,
      field: 'ratings',
      value: 5,
      user: 'user-id',
    });

    expect(result.isRight()).toBe(true);
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      _id: 'row-id',
      field: 'ratings',
      value: 5,
      user: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    }
  });

  it('deve retornar erro EVALUATION_ROW_TABLE_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      _id: 'row-id',
      field: 'ratings',
      value: 5,
      user: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('EVALUATION_ROW_TABLE_ERROR');
    }
  });
});
