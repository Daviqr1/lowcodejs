import { beforeEach, describe, expect, it } from 'vitest';

import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';

import UserRemoveFromTrashUseCase from './remove-from-trash.use-case';

let userInMemoryRepository: UserInMemoryRepository;
let sut: UserRemoveFromTrashUseCase;

describe('User Remove From Trash Use Case', () => {
  beforeEach(() => {
    userInMemoryRepository = new UserInMemoryRepository();
    sut = new UserRemoveFromTrashUseCase(userInMemoryRepository);
  });

  it('deve restaurar usuario da lixeira', async () => {
    const user = await userInMemoryRepository.create({
      name: 'A',
      email: 'a@x.com',
      password: 'p',
      group: 'g',
    });
    await userInMemoryRepository.update({
      _id: user._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ _id: user._id });

    expect(result.isRight()).toBe(true);
    const restored = await userInMemoryRepository.findById(user._id);
    expect(restored?.trashed).toBe(false);
    expect(restored?.trashedAt).toBeNull();
  });

  it('deve retornar USER_NOT_FOUND se usuario nao existe', async () => {
    const result = await sut.execute({ _id: 'unknown' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('USER_NOT_FOUND');
  });

  it('deve retornar NOT_TRASHED quando usuario nao esta na lixeira', async () => {
    const user = await userInMemoryRepository.create({
      name: 'A',
      email: 'a@x.com',
      password: 'p',
      group: 'g',
    });

    const result = await sut.execute({ _id: user._id });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('USER_NOT_FOUND');
  });

  it('deve retornar REMOVE_USER_FROM_TRASH_ERROR em falha interna', async () => {
    userInMemoryRepository.simulateError(
      'findById',
      new Error('Database error'),
    );

    const result = await sut.execute({ _id: 'x' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('REMOVE_USER_FROM_TRASH_ERROR');
  });
});
