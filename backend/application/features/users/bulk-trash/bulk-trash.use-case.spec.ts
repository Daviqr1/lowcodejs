import { beforeEach, describe, expect, it } from 'vitest';

import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import TrashService from '@application/services/trash/trash.service';

import UserBulkTrashUseCase from './bulk-trash.use-case';

let userRepo: UserInMemoryRepository;
let sut: UserBulkTrashUseCase;

describe('User Bulk Trash Use Case', () => {
  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    sut = new UserBulkTrashUseCase(userRepo, new TrashService());
  });

  it('deve enviar multiplos usuarios para a lixeira', async () => {
    const u1 = await userRepo.create({
      name: 'A',
      email: 'a@x.com',
      password: 'p',
      group: 'g',
    });
    const u2 = await userRepo.create({
      name: 'B',
      email: 'b@x.com',
      password: 'p',
      group: 'g',
    });

    const result = await sut.execute({
      ids: [u1._id, u2._id],
      actorId: 'actor',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.modified).toBe(2);
  });

  it('deve bloquear quando actor esta entre os ids', async () => {
    const result = await sut.execute({
      ids: ['x', 'me'],
      actorId: 'me',
    });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('CANNOT_TRASH_SELF');
  });

  it('deve ignorar usuarios ja na lixeira', async () => {
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

    const result = await sut.execute({
      ids: [u._id],
      actorId: 'actor',
    });
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.modified).toBe(0);
  });

  it('deve retornar BULK_TRASH_USERS_ERROR em falha interna', async () => {
    userRepo.simulateError('updateMany', new Error('Database error'));

    const result = await sut.execute({
      ids: ['x'],
      actorId: 'a',
    });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('BULK_TRASH_USERS_ERROR');
  });
});
