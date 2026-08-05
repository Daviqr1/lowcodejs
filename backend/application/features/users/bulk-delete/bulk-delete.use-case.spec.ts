import { beforeEach, describe, expect, it } from 'vitest';

import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import TrashService from '@application/services/trash/trash.service';

import UserBulkDeleteUseCase from './bulk-delete.use-case';

let userRepo: UserInMemoryRepository;
let tableRepo: TableInMemoryRepository;
let sut: UserBulkDeleteUseCase;

describe('User Bulk Delete Use Case', () => {
  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    tableRepo = new TableInMemoryRepository();
    sut = new UserBulkDeleteUseCase(userRepo, tableRepo, new TrashService());
  });

  it('deve excluir permanentemente usuarios na lixeira', async () => {
    const u = await userRepo.create({
      name: 'A',
      email: 'a@x.com',
      password: 'p',
      group: 'g',
    });
    await userRepo.update({
      _id: u._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ ids: [u._id], actorId: 'actor' });
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.deleted).toBe(1);
  });

  it('deve bloquear quando actor esta entre os ids', async () => {
    const result = await sut.execute({ ids: ['me'], actorId: 'me' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('CANNOT_DELETE_SELF');
  });

  it('deve ignorar usuarios nao-trashed', async () => {
    const u = await userRepo.create({
      name: 'A',
      email: 'a@x.com',
      password: 'p',
      group: 'g',
    });

    const result = await sut.execute({ ids: [u._id], actorId: 'actor' });
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.deleted).toBe(0);
  });

  it('deve retornar BULK_DELETE_USERS_ERROR em falha interna', async () => {
    userRepo.simulateError('findById', new Error('Database error'));

    const result = await sut.execute({ ids: ['x'], actorId: 'a' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('BULK_DELETE_USERS_ERROR');
  });
});
