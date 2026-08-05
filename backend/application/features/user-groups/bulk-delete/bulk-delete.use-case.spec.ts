import { beforeEach, describe, expect, it } from 'vitest';

import { E_ROLE } from '@application/core/entity.core';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import TrashService from '@application/services/trash/trash.service';

import UserGroupBulkDeleteUseCase from './bulk-delete.use-case';

let groupRepo: UserGroupInMemoryRepository;
let userRepo: UserInMemoryRepository;
let sut: UserGroupBulkDeleteUseCase;

describe('UserGroup Bulk Delete Use Case', () => {
  beforeEach(() => {
    groupRepo = new UserGroupInMemoryRepository();
    userRepo = new UserInMemoryRepository();
    sut = new UserGroupBulkDeleteUseCase(
      groupRepo,
      userRepo,
      new TrashService(),
    );
  });

  it('deve excluir grupos na lixeira sem usuarios', async () => {
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

    const result = await sut.execute({ ids: [g._id] });
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.deleted).toBe(1);
  });

  it('deve ignorar grupos do sistema', async () => {
    const g = await groupRepo.create({
      name: 'M',
      slug: E_ROLE.MASTER,
      permissions: [],
    });
    await groupRepo.update({
      _id: g._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ ids: [g._id] });
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.deleted).toBe(0);
  });

  it('deve ignorar grupos com usuarios', async () => {
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
    await userRepo.create({
      name: 'U',
      email: 'u@x.com',
      password: 'p',
      group: g._id,
    });

    const result = await sut.execute({ ids: [g._id] });
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.deleted).toBe(0);
  });

  it('deve retornar BULK_DELETE_GROUPS_ERROR em falha interna', async () => {
    groupRepo.simulateError('findById', new Error('Database error'));
    const result = await sut.execute({ ids: ['x'] });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('BULK_DELETE_GROUPS_ERROR');
  });
});
