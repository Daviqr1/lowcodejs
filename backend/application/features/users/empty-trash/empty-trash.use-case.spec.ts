import { beforeEach, describe, expect, it } from 'vitest';

import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import TrashService from '@application/services/trash/trash.service';

import UserEmptyTrashUseCase from './empty-trash.use-case';

let userRepo: UserInMemoryRepository;
let tableRepo: TableInMemoryRepository;
let sut: UserEmptyTrashUseCase;

describe('User Empty Trash Use Case', () => {
  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    tableRepo = new TableInMemoryRepository();
    sut = new UserEmptyTrashUseCase(userRepo, tableRepo, new TrashService());
  });

  it('deve esvaziar a lixeira removendo usuarios trashed sem tabelas', async () => {
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

  it('deve preservar usuarios nao-trashed', async () => {
    await userRepo.create({
      name: 'A',
      email: 'a@x.com',
      password: 'p',
      group: 'g',
    });
    const result = await sut.execute();
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected right');
    expect(result.value.deleted).toBe(0);
    const list = await userRepo.findMany();
    expect(list.length).toBe(1);
  });

  it('deve retornar EMPTY_TRASH_USERS_ERROR em falha interna', async () => {
    userRepo.simulateError('findManyTrashed', new Error('Database error'));
    const result = await sut.execute();
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('EMPTY_TRASH_USERS_ERROR');
  });
});
