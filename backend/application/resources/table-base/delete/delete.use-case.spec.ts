import { beforeEach, describe, expect, it } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RelationshipDefinitionInMemoryRepository from '@application/repositories/relationship-definition/relationship-definition-in-memory.repository';
import RelationshipLinkInMemoryRepository from '@application/repositories/relationship-link/relationship-link-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import RelationshipDeletionService from '@application/services/relationship/relationship-deletion.service';
import RelationshipService from '@application/services/relationship/relationship.service';

import TableDeleteUseCase from './delete.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let sut: TableDeleteUseCase;

describe('Table Delete Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    const linkRepository = new RelationshipLinkInMemoryRepository();
    const definitionRepository = new RelationshipDefinitionInMemoryRepository();
    const relationshipDeletion = new RelationshipDeletionService(
      new RelationshipService(linkRepository, fieldInMemoryRepository),
      definitionRepository,
      linkRepository,
      fieldInMemoryRepository,
      tableInMemoryRepository,
      new RowInMemoryRepository(),
    );
    sut = new TableDeleteUseCase(
      tableInMemoryRepository,
      fieldInMemoryRepository,
      relationshipDeletion,
    );
  });

  it('deve deletar tabela com sucesso', async () => {
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

    expect(result.value).toBeNull();
    const found = await tableInMemoryRepository.findById(created._id);
    expect(found).toBeNull();
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({ slug: 'non-existent' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    expect(result.value.message).toBe('Tabela não encontrada');
  });

  it('deve retornar erro DELETE_TABLE_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({ slug: 'some-slug' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('DELETE_TABLE_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
