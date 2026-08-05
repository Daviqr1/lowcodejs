import { beforeEach, describe, expect, it } from 'vitest';

import { E_ROLE } from '@application/core/entity.core';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';

import UserGroupSendToTrashUseCase from './send-to-trash.use-case';

let groupRepo: UserGroupInMemoryRepository;
let userRepo: UserInMemoryRepository;
let sut: UserGroupSendToTrashUseCase;

describe('UserGroup Send To Trash Use Case', () => {
  beforeEach(() => {
    groupRepo = new UserGroupInMemoryRepository();
    userRepo = new UserInMemoryRepository();
    sut = new UserGroupSendToTrashUseCase(groupRepo, userRepo);
  });

  it('deve enviar grupo para a lixeira', async () => {
    const group = await groupRepo.create({
      name: 'Custom',
      slug: 'custom',
      permissions: [],
    });

    const result = await sut.execute({ _id: group._id });
    expect(result.isRight()).toBe(true);
    const trashed = await groupRepo.findById(group._id, { trashed: true });
    expect(trashed?.trashed).toBe(true);
  });

  it('deve retornar USER_GROUP_NOT_FOUND', async () => {
    const result = await sut.execute({ _id: 'unknown' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('USER_GROUP_NOT_FOUND');
  });

  it('deve retornar SYSTEM_GROUP_PROTECTED para grupos do sistema', async () => {
    const group = await groupRepo.create({
      name: 'Master',
      slug: E_ROLE.MASTER,
      permissions: [],
    });
    const result = await sut.execute({ _id: group._id });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('SYSTEM_GROUP_PROTECTED');
  });

  it('deve retornar GROUP_HAS_USERS quando ha usuarios no grupo', async () => {
    const group = await groupRepo.create({
      name: 'Custom',
      slug: 'custom',
      permissions: [],
    });
    await userRepo.create({
      name: 'A',
      email: 'a@x.com',
      password: 'p',
      group: group._id,
    });

    const result = await sut.execute({ _id: group._id });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('GROUP_HAS_USERS');
  });

  it('deve retornar SEND_GROUP_TO_TRASH_ERROR em falha interna', async () => {
    groupRepo.simulateError('findById', new Error('Database error'));
    const result = await sut.execute({ _id: 'x' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('SEND_GROUP_TO_TRASH_ERROR');
  });
});
