import { beforeEach, describe, expect, it } from 'vitest';

import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';

import UserGroupRemoveFromTrashUseCase from './remove-from-trash.use-case';

let groupRepo: UserGroupInMemoryRepository;
let sut: UserGroupRemoveFromTrashUseCase;

describe('UserGroup Remove From Trash Use Case', () => {
  beforeEach(() => {
    groupRepo = new UserGroupInMemoryRepository();
    sut = new UserGroupRemoveFromTrashUseCase(groupRepo);
  });

  it('deve restaurar grupo da lixeira', async () => {
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
    const restored = await groupRepo.findById(group._id);
    expect(restored?.trashed).toBe(false);
    expect(restored?.trashedAt).toBeNull();
  });

  it('deve retornar SYSTEM_GROUP_PROTECTED ao restaurar grupo do sistema', async () => {
    const group = await groupRepo.create({
      name: 'Master',
      slug: 'MASTER',
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
    expect(result.value.code).toBe(403);
    expect(result.value.cause).toBe('SYSTEM_GROUP_PROTECTED');
  });

  it('deve retornar USER_GROUP_NOT_FOUND', async () => {
    const result = await sut.execute({ _id: 'unknown' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('USER_GROUP_NOT_FOUND');
  });

  it('deve retornar REMOVE_GROUP_FROM_TRASH_ERROR em falha interna', async () => {
    groupRepo.simulateError('findById', new Error('Database error'));
    const result = await sut.execute({ _id: 'x' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('REMOVE_GROUP_FROM_TRASH_ERROR');
  });
});
