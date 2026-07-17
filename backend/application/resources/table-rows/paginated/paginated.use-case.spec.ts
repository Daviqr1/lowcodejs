import { beforeEach, describe, expect, it } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import RelationshipDefinitionInMemoryRepository from '@application/repositories/relationship-definition/relationship-definition-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryFieldVisibilityService from '@application/services/field-visibility/in-memory-field-visibility.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import InMemoryRelationshipBuilderService from '@application/services/table/in-memory-relationship-builder.service';
import InMemoryRowContextBuilder from '@application/services/table/in-memory-row-context-builder.service';

import TableRowPaginatedUseCase from './paginated.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let rowContextBuilder: InMemoryRowContextBuilder;
let fieldVisibility: InMemoryFieldVisibilityService;
let sut: TableRowPaginatedUseCase;

describe('Table Row Paginated Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    rowContextBuilder = new InMemoryRowContextBuilder();
    fieldVisibility = new InMemoryFieldVisibilityService();

    sut = new TableRowPaginatedUseCase(
      tableInMemoryRepository,
      rowRepository,
      rowPasswordService,
      rowContextBuilder,
      fieldVisibility,
      new InMemoryRowAccessGuardService(),
      new InMemoryRelationshipBuilderService(),
      new RelationshipDefinitionInMemoryRepository(),
    );
  });

  it('deve retornar lista de rows paginada', async () => {
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

    await rowRepository.create({ table, data: { nome: 'Test 1' } });
    await rowRepository.create({ table, data: { nome: 'Test 2' } });

    const result = await sut.execute({
      slug: 'clientes',
      page: 1,
      perPage: 20,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.data).toHaveLength(2);
      expect(result.value.meta.total).toBe(2);
    }
  });

  it('deve retornar TODOS os registros quando perPage = -1 (sem paginação)', async () => {
    const table = await tableInMemoryRepository.create({
      name: 'Cards',
      slug: 'cards',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.KANBAN,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    // Cria mais registros do que o teto antigo (100) para garantir que
    // nenhuma coluna do kanban seja truncada.
    for (let i = 0; i < 130; i++) {
      await rowRepository.create({ table, data: { nome: `Card ${i}` } });
    }

    const result = await sut.execute({
      slug: 'cards',
      page: 1,
      perPage: -1,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.data).toHaveLength(130);
      expect(result.value.meta.total).toBe(130);
      expect(result.value.meta.lastPage).toBe(1);
      expect(result.value.meta.perPage).toBe(130);
    }
  });

  it('excludeSelfId: oculta o próprio registro dos candidatos (auto-relacionamento)', async () => {
    const table = await tableInMemoryRepository.create({
      name: 'Produtos',
      slug: 'produtos',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const self = await rowRepository.create({
      table,
      data: { nome: 'Produto A' },
    });
    await rowRepository.create({ table, data: { nome: 'Produto B' } });

    const result = await sut.execute({
      slug: 'produtos',
      page: 1,
      perPage: 20,
      excludeSelfId: self._id,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.data).toHaveLength(1);
      expect(result.value.meta.total).toBe(1);
      expect(result.value.data.some((row) => row._id === self._id)).toBe(false);
    }
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      page: 1,
      perPage: 20,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    }
  });

  it('deve retornar erro LIST_ROW_TABLE_PAGINATED_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      page: 1,
      perPage: 20,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('LIST_ROW_TABLE_PAGINATED_ERROR');
    }
  });
});
