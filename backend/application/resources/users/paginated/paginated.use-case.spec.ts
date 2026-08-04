import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_ROLE, type IUser } from '@application/core/entity.core';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import HttpResponseService from '@application/services/http-response/http-response.service';

import UserPaginatedUseCase from './paginated.use-case';

let userInMemoryRepository: UserInMemoryRepository;
let sut: UserPaginatedUseCase;

describe('User Paginated Use Case', () => {
  beforeEach(() => {
    userInMemoryRepository = new UserInMemoryRepository();
    sut = new UserPaginatedUseCase(
      userInMemoryRepository,
      new HttpResponseService(),
    );
  });

  it('deve retornar lista vazia quando nao houver usuarios', async () => {
    const result = await sut.execute({
      page: 1,
      perPage: 20,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.data).toHaveLength(0);
    expect(result.value.meta.total).toBe(0);
    expect(result.value.meta.firstPage).toBe(0);
    // Lista vazia tem lastPage 1, nao 0: `page: 1` nao pode ser maior que o
    // total de paginas.
    expect(result.value.meta.lastPage).toBe(1);
  });

  it('deve retornar lista de usuarios quando existirem', async () => {
    for (let i = 0; i < 5; i++) {
      await userInMemoryRepository.create({
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        password: 'password123',
        group: 'group-id',
      });
    }

    const result = await sut.execute({
      page: 1,
      perPage: 20,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.data).toHaveLength(5);
    expect(result.value.meta.total).toBe(5);
    expect(result.value.meta.page).toBe(1);
    expect(result.value.meta.perPage).toBe(20);
    expect(result.value.meta.firstPage).toBe(1);
  });

  it('deve retornar meta com paginacao correta', async () => {
    for (let i = 0; i < 25; i++) {
      await userInMemoryRepository.create({
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        password: 'password123',
        group: 'group-id',
      });
    }

    const result = await sut.execute({
      page: 1,
      perPage: 10,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.data).toHaveLength(10);
    expect(result.value.meta.total).toBe(25);
    expect(result.value.meta.lastPage).toBe(3);
    expect(result.value.meta.firstPage).toBe(1);
    expect(result.value.meta.page).toBe(1);
    expect(result.value.meta.perPage).toBe(10);
  });

  it('deve retornar segunda pagina corretamente', async () => {
    for (let i = 0; i < 25; i++) {
      await userInMemoryRepository.create({
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        password: 'password123',
        group: 'group-id',
      });
    }

    const result = await sut.execute({
      page: 2,
      perPage: 10,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.data).toHaveLength(10);
    expect(result.value.meta.page).toBe(2);
    expect(result.value.meta.total).toBe(25);
  });

  it('deve incluir o usuario logado nos resultados da listagem', async () => {
    const loggedUser = await userInMemoryRepository.create({
      name: 'Logged User',
      email: 'logged@example.com',
      password: 'password123',
      group: 'group-id',
    });

    for (let i = 0; i < 3; i++) {
      await userInMemoryRepository.create({
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        password: 'password123',
        group: 'group-id',
      });
    }

    const result = await sut.execute({
      page: 1,
      perPage: 20,
      user: { _id: loggedUser._id, role: E_ROLE.MASTER },
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.data).toHaveLength(4);
    expect(result.value.meta.total).toBe(4);

    const hasLoggedUser = result.value.data.some(
      (u: IUser) => u._id === loggedUser._id,
    );
    expect(hasLoggedUser).toBe(true);
  });

  it('deve retornar erro LIST_USER_PAGINATED_ERROR quando houver falha', async () => {
    const findManySpy = vi
      .spyOn(userInMemoryRepository, 'findMany')
      .mockRejectedValueOnce(new Error('Database error'));

    const result = await sut.execute({
      page: 1,
      perPage: 20,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('LIST_USER_PAGINATED_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');

    expect(findManySpy).toHaveBeenCalledTimes(1);
  });
});
