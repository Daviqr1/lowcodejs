import { beforeEach, describe, expect, it } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import InMemoryRowContextBuilder from '@application/services/table/in-memory-row-context-builder.service';

import TableRowShowBySlugUseCase from './show-by-slug.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let rowContextBuilder: InMemoryRowContextBuilder;
let sut: TableRowShowBySlugUseCase;

const baseTable = {
  _schema: {},
  fields: [],
  owner: 'owner-id',
  style: E_TABLE_STYLE.LIST,
  fieldOrderList: [],
  fieldOrderForm: [],
};

describe('Table Row Show By Slug Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();
    rowContextBuilder = new InMemoryRowContextBuilder();

    sut = new TableRowShowBySlugUseCase(
      tableInMemoryRepository,
      rowRepository,
      rowPasswordService,
      rowContextBuilder,
    );
  });

  it('deve retornar TABLE_NOT_FOUND quando a tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'inexistente',
      rowSlug: 'qualquer',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    }
  });

  it('deve retornar TABLE_SLUG_FIELD_NOT_CONFIGURED quando rowSlugFieldId nao estiver definido', async () => {
    await tableInMemoryRepository.create({
      ...baseTable,
      name: 'Tarefas',
      slug: 'tarefas',
      rowSlugFieldId: null,
    });

    const result = await sut.execute({
      slug: 'tarefas',
      rowSlug: 'nome-tarefa-xyz',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(400);
      expect(result.value.cause).toBe('TABLE_SLUG_FIELD_NOT_CONFIGURED');
    }
  });

  it('deve retornar ROW_NOT_FOUND quando nenhum registro tiver o slug', async () => {
    await tableInMemoryRepository.create({
      ...baseTable,
      name: 'Tarefas',
      slug: 'tarefas',
      rowSlugFieldId: 'field-nome',
    });

    const result = await sut.execute({
      slug: 'tarefas',
      rowSlug: 'nome-tarefa-xyz',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('ROW_NOT_FOUND');
    }
  });

  it('deve retornar o registro encontrado pelo sharedRowSlug', async () => {
    const table = await tableInMemoryRepository.create({
      ...baseTable,
      name: 'Tarefas',
      slug: 'tarefas',
      rowSlugFieldId: 'field-nome',
    });

    await rowRepository.create({
      table,
      data: { nome: 'Nome Tarefa XYZ', sharedRowSlug: 'nome-tarefa-xyz' },
    });

    const result = await sut.execute({
      slug: 'tarefas',
      rowSlug: 'nome-tarefa-xyz',
      user: 'user-123',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.sharedRowSlug).toBe('nome-tarefa-xyz');
    }
  });

  it('deve retornar GET_ROW_BY_SLUG_ERROR quando houver falha interna', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'tarefas',
      rowSlug: 'nome-tarefa-xyz',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('GET_ROW_BY_SLUG_ERROR');
    }
  });
});
