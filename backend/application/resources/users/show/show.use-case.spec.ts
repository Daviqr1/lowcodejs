import { beforeEach, describe, expect, it, vi } from 'vitest';

import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserMapperService from '@application/services/user-mapper/user-mapper.service';

import UserShowUseCase from './show.use-case';

let userInMemoryRepository: UserInMemoryRepository;
let sut: UserShowUseCase;

describe('User Show Use Case', () => {
  beforeEach(() => {
    userInMemoryRepository = new UserInMemoryRepository();
    sut = new UserShowUseCase(userInMemoryRepository, new UserMapperService());
  });

  it('deve retornar usuario quando encontrado', async () => {
    const created = await userInMemoryRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      group: 'group-id',
    });

    const result = await sut.execute({ _id: created._id });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value._id).toBe(created._id);
    expect(result.value.name).toBe('John Doe');
    expect(result.value.email).toBe('john@example.com');
  });

  it('deve retornar erro USER_NOT_FOUND (404) quando usuario nao existe', async () => {
    const result = await sut.execute({ _id: 'non-existent-id' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('USER_NOT_FOUND');
    expect(result.value.message).toBe('Usuário não encontrado');
  });

  it('deve retornar erro GET_USER_BY_ID_ERROR (500) em falha de DB', async () => {
    const findByIdSpy = vi
      .spyOn(userInMemoryRepository, 'findById')
      .mockRejectedValueOnce(new Error('Database error'));

    const result = await sut.execute({ _id: 'any-id' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('GET_USER_BY_ID_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');

    expect(findByIdSpy).toHaveBeenCalledTimes(1);
  });
});
