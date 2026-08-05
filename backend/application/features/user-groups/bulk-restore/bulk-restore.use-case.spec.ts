import { beforeEach, describe, expect, it } from 'vitest';

import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import TrashService from '@application/services/trash/trash.service';

import UserGroupBulkRestoreUseCase from './bulk-restore.use-case';

let groupRepo: UserGroupInMemoryRepository;
let sut: UserGroupBulkRestoreUseCase;

describe('UserGroup Bulk Restore Use Case', () => {
  beforeEach(() => {
    groupRepo = new UserGroupInMemoryRepository();
    sut = new UserGroupBulkRestoreUseCase(groupRepo, new TrashService());
  });

  it('deve restaurar varios grupos', async () => {
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
    expect(result.value.modified).toBe(1);
  });

  it('deve ignorar grupos nao-trashed', async () => {
    const g = await groupRepo.create({
      name: 'A',
      slug: 'a',
      permissions: [],
    });
    const result = await sut.execute({ ids: [g._id] });
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.modified).toBe(0);
  });

  it('deve retornar 0 quando IDs nao existem', async () => {
    const result = await sut.execute({ ids: ['x'] });
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.modified).toBe(0);
  });

  it('deve retornar BULK_RESTORE_GROUPS_ERROR em falha interna', async () => {
    groupRepo.simulateError('updateMany', new Error('Database error'));
    const result = await sut.execute({ ids: ['x'] });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('BULK_RESTORE_GROUPS_ERROR');
  });
});
