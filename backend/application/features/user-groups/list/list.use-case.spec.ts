import { beforeEach, describe, expect, it } from 'vitest';

import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';

import UserGroupListUseCase from './list.use-case';

let userGroupInMemoryRepository: UserGroupInMemoryRepository;
let userInMemoryRepository: UserInMemoryRepository;
let groupResolver: GroupResolverService;
let sut: UserGroupListUseCase;

describe('UserGroup List Use Case', () => {
  beforeEach(() => {
    userGroupInMemoryRepository = new UserGroupInMemoryRepository();
    userInMemoryRepository = new UserInMemoryRepository();
    groupResolver = new GroupResolverService(userGroupInMemoryRepository);
    sut = new UserGroupListUseCase(
      userGroupInMemoryRepository,
      userInMemoryRepository,
      groupResolver,
    );
  });

  it('deve retornar lista vazia quando nao houver grupos', async () => {
    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value).toHaveLength(0);
  });

  it('deve retornar lista de grupos quando existirem', async () => {
    for (let i = 0; i < 5; i++) {
      await userGroupInMemoryRepository.create({
        name: `Grupo ${i + 1}`,
        slug: `grupo-${i + 1}`,
        permissions: ['permission-1'],
      });
    }

    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value).toHaveLength(5);
  });

  it('deve retornar erro LIST_USER_GROUP_ERROR quando houver falha', async () => {
    userGroupInMemoryRepository.simulateError(
      'findMany',
      new Error('Database error'),
    );

    const result = await sut.execute();

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('LIST_USER_GROUP_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
