import { beforeEach, describe, expect, it } from 'vitest';

import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import TrashService from '@application/services/trash/trash.service';

import UserGroupEmptyTrashUseCase from './empty-trash.use-case';

let groupRepo: UserGroupInMemoryRepository;
let userRepo: UserInMemoryRepository;
let sut: UserGroupEmptyTrashUseCase;

describe('UserGroup Empty Trash Use Case', () => {
  beforeEach(() => {
    groupRepo = new UserGroupInMemoryRepository();
    userRepo = new UserInMemoryRepository();
    sut = new UserGroupEmptyTrashUseCase(
      groupRepo,
      userRepo,
      new TrashService(),
    );
  });

  it('deve esvaziar a lixeira', async () => {
    const g = await groupRepo.create({
      name: 'A',
      slug: 'a',
      permissions: [],
    });
    await groupRepo.update({
      _id: g._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute();
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.deleted).toBe(1);
  });

  it('deve retornar 0 quando lixeira esta vazia', async () => {
    const result = await sut.execute();
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.deleted).toBe(0);
  });

  it('deve preservar grupos nao-trashed', async () => {
    await groupRepo.create({
      name: 'Active',
      slug: 'active',
      permissions: [],
    });
    const result = await sut.execute();
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.deleted).toBe(0);
  });

  it('deve retornar EMPTY_TRASH_GROUPS_ERROR em falha interna', async () => {
    groupRepo.simulateError('findManyTrashed', new Error('Database error'));
    const result = await sut.execute();
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('EMPTY_TRASH_GROUPS_ERROR');
  });
});
