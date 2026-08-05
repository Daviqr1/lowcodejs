import { beforeEach, describe, expect, it } from 'vitest';

import { E_USER_STATUS } from '@application/core/entity.core';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';

import UserBulkUpdateUseCase from './bulk-update.use-case';

let userRepository: UserInMemoryRepository;
let sut: UserBulkUpdateUseCase;

async function createUser(
  email: string,
  status = E_USER_STATUS.ACTIVE,
): ReturnType<UserInMemoryRepository['create']> {
  return userRepository.create({
    name: email,
    email,
    password: 'hash',
    group: 'group-1',
    status,
  });
}

describe('User Bulk Update Use Case', () => {
  beforeEach(() => {
    userRepository = new UserInMemoryRepository();
    sut = new UserBulkUpdateUseCase(userRepository);
  });

  it('deve alterar o status de varios usuarios', async () => {
    const u1 = await createUser('a@a.com');
    const u2 = await createUser('b@b.com');

    const result = await sut.execute({
      ids: [u1._id, u2._id],
      status: E_USER_STATUS.INACTIVE,
      actorId: 'outro-usuario',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.modified).toBe(2);

    const after = await userRepository.findById(u1._id);
    expect(after?.status).toBe(E_USER_STATUS.INACTIVE);
  });

  it('nunca altera o status do proprio usuario (exclui self)', async () => {
    const u1 = await createUser('a@a.com');
    const me = await createUser('me@me.com');

    const result = await sut.execute({
      ids: [u1._id, me._id],
      status: E_USER_STATUS.INACTIVE,
      actorId: me._id,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.modified).toBe(1);

    const meAfter = await userRepository.findById(me._id);
    expect(meAfter?.status).toBe(E_USER_STATUS.ACTIVE);
  });

  it('retorna modified=0 quando so o proprio usuario foi selecionado', async () => {
    const me = await createUser('me@me.com');

    const result = await sut.execute({
      ids: [me._id],
      status: E_USER_STATUS.INACTIVE,
      actorId: me._id,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.modified).toBe(0);
  });

  it('retorna BULK_UPDATE_USERS_ERROR em falha', async () => {
    userRepository.simulateError('updateMany', new Error('db error'));
    const u1 = await createUser('a@a.com');

    const result = await sut.execute({
      ids: [u1._id],
      status: E_USER_STATUS.INACTIVE,
      actorId: 'outro',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft())
      expect(result.value.cause).toBe('BULK_UPDATE_USERS_ERROR');
  });
});
