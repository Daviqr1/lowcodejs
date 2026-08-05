import { beforeEach, describe, expect, it } from 'vitest';

import { E_ROLE, type IGroup } from '@application/core/entity.core';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';

import UserSendToTrashUseCase from './send-to-trash.use-case';

let userInMemoryRepository: UserInMemoryRepository;
let userGroupInMemoryRepository: UserGroupInMemoryRepository;
let groupResolver: GroupResolverService;
let sut: UserSendToTrashUseCase;

function makeGroup(slug: string): IGroup {
  return {
    _id: 'group-' + slug,
    name: slug,
    slug,
    description: null,
    permissions: [],
    encompasses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    trashed: false,
    trashedAt: null,
  };
}

describe('User Send To Trash Use Case', () => {
  beforeEach(() => {
    userInMemoryRepository = new UserInMemoryRepository();
    userGroupInMemoryRepository = new UserGroupInMemoryRepository();
    // O fecho de grupos resolve o privilegio a partir do group repo (id->grupo).
    userGroupInMemoryRepository.items.push(
      makeGroup(E_ROLE.MASTER),
      makeGroup(E_ROLE.ADMINISTRATOR),
      makeGroup(E_ROLE.MANAGER),
    );
    groupResolver = new GroupResolverService(userGroupInMemoryRepository);
    sut = new UserSendToTrashUseCase(userInMemoryRepository, groupResolver);
  });

  it('deve enviar usuario para a lixeira com sucesso', async () => {
    const user = await userInMemoryRepository.create({
      name: 'Joao',
      email: 'joao@x.com',
      password: 'pwd',
      group: 'group-admin',
    });
    user.group = makeGroup(E_ROLE.MANAGER);

    const result = await sut.execute({
      _id: user._id,
      actorId: 'actor-1',
    });

    expect(result.isRight()).toBe(true);
    const trashed = await userInMemoryRepository.findById(user._id, {
      trashed: true,
    });
    expect(trashed?.trashed).toBe(true);
  });

  it('deve retornar CANNOT_TRASH_SELF quando _id === actorId', async () => {
    const user = await userInMemoryRepository.create({
      name: 'Self',
      email: 's@x.com',
      password: 'p',
      group: 'g',
    });

    const result = await sut.execute({
      _id: user._id,
      actorId: user._id,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('CANNOT_TRASH_SELF');
    expect(result.value.code).toBe(409);
  });

  it('deve retornar USER_NOT_FOUND quando usuario nao existe', async () => {
    const result = await sut.execute({
      _id: 'unknown',
      actorId: 'actor',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('USER_NOT_FOUND');
  });

  it('deve retornar ALREADY_TRASHED se ja esta na lixeira', async () => {
    const user = await userInMemoryRepository.create({
      name: 'A',
      email: 'a@x.com',
      password: 'p',
      group: 'g',
    });
    await userInMemoryRepository.update({
      _id: user._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({
      _id: user._id,
      actorId: 'other',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('ALREADY_TRASHED');
  });

  it('deve bloquear ADMIN tentando enviar MASTER para lixeira', async () => {
    const user = await userInMemoryRepository.create({
      name: 'M',
      email: 'm@x.com',
      password: 'p',
      group: 'group-master',
    });
    user.group = makeGroup(E_ROLE.MASTER);

    const result = await sut.execute({
      _id: user._id,
      actorId: 'actor-1',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('CANNOT_TRASH_MASTER');
    expect(result.value.code).toBe(403);
  });

  it('deve retornar SEND_USER_TO_TRASH_ERROR em falha interna', async () => {
    userInMemoryRepository.simulateError(
      'findById',
      new Error('Database error'),
    );

    const result = await sut.execute({
      _id: 'x',
      actorId: 'a',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('expected left');
    expect(result.value.cause).toBe('SEND_USER_TO_TRASH_ERROR');
  });
});
