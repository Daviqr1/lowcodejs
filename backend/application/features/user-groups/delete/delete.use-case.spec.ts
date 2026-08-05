import { beforeEach, describe, expect, it } from 'vitest';

import { E_ROLE } from '@application/core/entity.core';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';

import UserGroupDeleteUseCase from './delete.use-case';

let groupRepo: UserGroupInMemoryRepository;
let userRepo: UserInMemoryRepository;
let sut: UserGroupDeleteUseCase;

describe('UserGroup Delete Use Case', () => {
  beforeEach(() => {
    groupRepo = new UserGroupInMemoryRepository();
    userRepo = new UserInMemoryRepository();
    sut = new UserGroupDeleteUseCase(groupRepo, userRepo);
  });

  it('deve excluir grupo na lixeira sem usuarios', async () => {
    const group = await groupRepo.create({
      name: 'A',
      slug: 'a',
      permissions: [],
    });
    await groupRepo.update({
      _id: group._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ _id: group._id });
    expect(result.isRight()).toBe(true);
    const found = await groupRepo.findById(group._id, { trashed: true });
    expect(found).toBeNull();
  });

  it('deve retornar SYSTEM_GROUP_PROTECTED', async () => {
    const group = await groupRepo.create({
      name: 'Master',
      slug: E_ROLE.MASTER,
      permissions: [],
    });
    await groupRepo.update({
      _id: group._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ _id: group._id });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('SYSTEM_GROUP_PROTECTED');
  });

  it('deve retornar GROUP_HAS_USERS', async () => {
    const group = await groupRepo.create({
      name: 'A',
      slug: 'a',
      permissions: [],
    });
    await groupRepo.update({
      _id: group._id,
      trashed: true,
      trashedAt: new Date(),
    });
    await userRepo.create({
      name: 'U',
      email: 'u@x.com',
      password: 'p',
      group: group._id,
    });

    const result = await sut.execute({ _id: group._id });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('GROUP_HAS_USERS');
  });

  it('deve retornar USER_GROUP_NOT_FOUND', async () => {
    const result = await sut.execute({ _id: 'unknown' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('USER_GROUP_NOT_FOUND');
  });

  it('deve retornar DELETE_GROUP_ERROR em falha interna', async () => {
    groupRepo.simulateError('findById', new Error('Database error'));
    const result = await sut.execute({ _id: 'x' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('DELETE_GROUP_ERROR');
  });
});
