import { beforeEach, describe, expect, it } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';

import UserDeleteUseCase from './delete.use-case';

let userRepo: UserInMemoryRepository;
let tableRepo: TableInMemoryRepository;
let sut: UserDeleteUseCase;

describe('User Delete Use Case', () => {
  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    tableRepo = new TableInMemoryRepository();
    sut = new UserDeleteUseCase(userRepo, tableRepo);
  });

  it('deve excluir permanentemente usuario na lixeira', async () => {
    const user = await userRepo.create({
      name: 'A',
      email: 'a@x.com',
      password: 'p',
      group: 'g',
    });
    await userRepo.update({
      _id: user._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ _id: user._id, actorId: 'other' });

    expect(result.isRight()).toBe(true);
    const found = await userRepo.findById(user._id, { trashed: true });
    expect(found).toBeNull();
  });

  it('deve retornar CANNOT_DELETE_SELF', async () => {
    const result = await sut.execute({ _id: 'self', actorId: 'self' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('CANNOT_DELETE_SELF');
  });

  it('deve bloquear exclusao se usuario possui tabelas', async () => {
    const user = await userRepo.create({
      name: 'A',
      email: 'a@x.com',
      password: 'p',
      group: 'g',
    });
    await userRepo.update({
      _id: user._id,
      trashed: true,
      trashedAt: new Date(),
    });
    await tableRepo.create({
      name: 'T',
      slug: 't',
      _schema: {},
      fields: [],
      owner: user._id,
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({ _id: user._id, actorId: 'actor' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('OWNER_OF_TABLES');
  });

  it('deve retornar USER_NOT_FOUND se nao encontrado', async () => {
    const result = await sut.execute({ _id: 'unknown', actorId: 'actor' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('USER_NOT_FOUND');
  });

  it('deve retornar DELETE_USER_ERROR em falha interna', async () => {
    userRepo.simulateError('findById', new Error('Database error'));

    const result = await sut.execute({ _id: 'x', actorId: 'a' });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('DELETE_USER_ERROR');
  });
});
