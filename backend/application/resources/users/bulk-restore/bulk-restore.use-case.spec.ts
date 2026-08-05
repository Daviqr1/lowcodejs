import { beforeEach, describe, expect, it } from 'vitest';

import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import TrashService from '@application/services/trash/trash.service';

import UserBulkRestoreUseCase from './bulk-restore.use-case';

let userRepo: UserInMemoryRepository;
let sut: UserBulkRestoreUseCase;

describe('User Bulk Restore Use Case', () => {
  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    sut = new UserBulkRestoreUseCase(userRepo, new TrashService());
  });

  it('deve restaurar varios usuarios da lixeira', async () => {
    const u1 = await userRepo.create({
      name: 'A',
      email: 'a@x.com',
      password: 'p',
      group: 'g',
    });
    await userRepo.update({
      _id: u1._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ ids: [u1._id] });
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.modified).toBe(1);
  });

  it('deve ignorar usuarios nao-trashed', async () => {
    const u = await userRepo.create({
      name: 'A',
      email: 'a@x.com',
      password: 'p',
      group: 'g',
    });
    const result = await sut.execute({ ids: [u._id] });
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.modified).toBe(0);
  });

  it('deve retornar 0 quando IDs nao existem', async () => {
    const result = await sut.execute({ ids: ['x', 'y'] });
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.modified).toBe(0);
  });

  it('deve retornar BULK_RESTORE_USERS_ERROR em falha interna', async () => {
    userRepo.simulateError('updateMany', new Error('Database error'));

    const result = await sut.execute({ ids: ['x'] });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('BULK_RESTORE_USERS_ERROR');
  });
});
