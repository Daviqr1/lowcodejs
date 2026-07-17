import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryFieldVisibilityService from '@application/services/field-visibility/in-memory-field-visibility.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import InMemoryRowContextBuilder from '@application/services/table/in-memory-row-context-builder.service';

import TableRowShowUseCase from './show.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let rowContextBuilder: InMemoryRowContextBuilder;
let fieldVisibility: InMemoryFieldVisibilityService;
let sut: TableRowShowUseCase;

describe('Table Row Show Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    rowContextBuilder = new InMemoryRowContextBuilder();
    fieldVisibility = new InMemoryFieldVisibilityService();

    sut = new TableRowShowUseCase(
      tableInMemoryRepository,
      rowRepository,
      rowPasswordService,
      rowContextBuilder,
      fieldVisibility,
      new InMemoryRowAccessGuardService(),
    );
    vi.clearAllMocks();
  });

  it('deve retornar row existente', async () => {
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

    const row = await rowRepository.create({
      table,
      data: { nome: 'Test' },
    });

    const result = await sut.execute({
      slug: 'clientes',
      _id: row._id,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value._id).toBeDefined();
    }
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      _id: 'row-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    }
  });

  it('deve retornar erro GET_ROW_TABLE_BY_ID_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      _id: 'row-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('GET_ROW_TABLE_BY_ID_ERROR');
    }
  });
});
