import { beforeEach, describe, expect, it } from 'vitest';

import { E_RELATIONSHIP_ON_DELETE } from '@application/core/entity.core';
import RelationshipDefinitionInMemoryRepository from '@application/repositories/relationship-definition/relationship-definition-in-memory.repository';

import RelationshipUpdateUseCase from './update.use-case';

let definitions: RelationshipDefinitionInMemoryRepository;
let sut: RelationshipUpdateUseCase;

async function makeDefinition(): Promise<string> {
  const definition = await definitions.create({
    name: 'Pedidos x Clientes',
    onDelete: E_RELATIONSHIP_ON_DELETE.SET_NULL,
    source: {
      table: { _id: 'table-pedidos', slug: 'pedidos' },
      field: { _id: 'field-cliente', slug: 'cliente' },
      visible: true,
      label: 'Cliente',
    },
    target: {
      table: { _id: 'table-clientes', slug: 'clientes' },
      field: { _id: 'field-pedidos', slug: 'pedidos' },
      visible: true,
      label: 'Pedidos',
    },
  });
  return definition._id;
}

describe('Relationship Update Use Case', () => {
  beforeEach(() => {
    definitions = new RelationshipDefinitionInMemoryRepository();
    sut = new RelationshipUpdateUseCase(definitions);
  });

  it('atualiza a definicao pelo slug do lado source', async () => {
    const id = await makeDefinition();

    const result = await sut.execute({
      slug: 'pedidos',
      id,
      name: 'Novo nome',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.name).toBe('Novo nome');
  });

  it('atualiza a definicao pelo slug do lado target', async () => {
    const id = await makeDefinition();

    const result = await sut.execute({
      slug: 'clientes',
      id,
      name: 'Outro nome',
    });

    expect(result.isRight()).toBe(true);
  });

  it('recusa a definicao de outra tabela (IDOR)', async () => {
    const id = await makeDefinition();

    const result = await sut.execute({
      slug: 'financeiro',
      id,
      name: 'Sequestrado',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('RELATIONSHIP_NOT_FOUND');

    const untouched = await definitions.findById(id);
    expect(untouched?.name).toBe('Pedidos x Clientes');
  });
});
