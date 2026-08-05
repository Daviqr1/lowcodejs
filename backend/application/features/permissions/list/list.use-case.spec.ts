import { beforeEach, describe, expect, it } from 'vitest';

import PermissionInMemoryRepository from '@application/repositories/permission/permission-in-memory.repository';

import PermissionListUseCase from './list.use-case';

let permissionInMemoryRepository: PermissionInMemoryRepository;
let sut: PermissionListUseCase;

describe('Permission List Use Case', () => {
  beforeEach(() => {
    permissionInMemoryRepository = new PermissionInMemoryRepository();
    sut = new PermissionListUseCase(permissionInMemoryRepository);
  });

  it('deve retornar lista vazia quando nao houver permissoes', async () => {
    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value).toHaveLength(0);
  });

  it('deve retornar lista de permissoes existentes', async () => {
    await permissionInMemoryRepository.create({
      name: 'Create User',
      slug: 'CREATE_USER',
      description: 'Create a new user',
    });

    await permissionInMemoryRepository.create({
      name: 'Update User',
      slug: 'UPDATE_USER',
      description: 'Update a user',
    });

    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value).toHaveLength(2);
    expect(result.value[0].slug).toBe('CREATE_USER');
    expect(result.value[1].slug).toBe('UPDATE_USER');
  });

  it('deve retornar erro LIST_PERMISSION_ERROR quando houver falha', async () => {
    permissionInMemoryRepository.simulateError(
      'findMany',
      new Error('Database error'),
    );

    const result = await sut.execute();

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('LIST_PERMISSION_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
