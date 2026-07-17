import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RelationshipDefinitionInMemoryRepository from '@application/repositories/relationship-definition/relationship-definition-in-memory.repository';
import RelationshipLinkInMemoryRepository from '@application/repositories/relationship-link/relationship-link-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import RelationshipDeletionService from '@application/services/relationship/relationship-deletion.service';
import RelationshipService from '@application/services/relationship/relationship.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';

import TableRowDeleteUseCase from './delete.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let sut: TableRowDeleteUseCase;

describe('Table Row Delete Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    const linkRepository = new RelationshipLinkInMemoryRepository();
    const definitionRepository = new RelationshipDefinitionInMemoryRepository();
    const fieldRepository = new FieldInMemoryRepository();
    const relationshipDeletion = new RelationshipDeletionService(
      new RelationshipService(linkRepository, fieldRepository),
      definitionRepository,
      linkRepository,
      fieldRepository,
      tableInMemoryRepository,
      rowRepository,
    );
    sut = new TableRowDeleteUseCase(
      tableInMemoryRepository,
      rowRepository,
      relationshipDeletion,
      new InMemoryRowAccessGuardService(),
    );
    vi.clearAllMocks();
  });

  it('deve deletar row com sucesso', async () => {
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
      expect(result.value).toBeNull();
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

  it('deve retornar erro DELETE_ROW_ERROR quando houver falha', async () => {
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
      expect(result.value.cause).toBe('DELETE_ROW_ERROR');
    }
  });
});
