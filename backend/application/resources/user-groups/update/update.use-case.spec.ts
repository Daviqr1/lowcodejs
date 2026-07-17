import { beforeEach, describe, expect, it } from 'vitest';

import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';

import UserGroupUpdateUseCase from './update.use-case';

let userGroupInMemoryRepository: UserGroupInMemoryRepository;
let sut: UserGroupUpdateUseCase;

describe('UserGroup Update Use Case', () => {
  beforeEach(() => {
    userGroupInMemoryRepository = new UserGroupInMemoryRepository();
    sut = new UserGroupUpdateUseCase(userGroupInMemoryRepository);
  });

  it('deve atualizar um grupo de usuarios com sucesso', async () => {
    const created = await userGroupInMemoryRepository.create({
      name: 'Administradores',
      slug: 'administradores',
      permissions: ['permission-1'],
    });

    const result = await sut.execute({
      _id: created._id,
      permissions: ['permission-1', 'permission-2'],
      description: 'Group description',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.permissions).toHaveLength(2);

    const persisted = await userGroupInMemoryRepository.findById(created._id);
    expect(persisted?.permissions).toHaveLength(2);
    expect(persisted?.description).toBe('Group description');
  });

  it('deve retornar erro USER_GROUP_NOT_FOUND quando grupo nao existe', async () => {
    const result = await sut.execute({
      _id: 'non-existent-id',
      permissions: ['permission-1'],
      description: 'Group description',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('USER_GROUP_NOT_FOUND');
    expect(result.value.message).toBe('Grupo de usuários não encontrado');
  });

  it('deve retornar SYSTEM_GROUP_PROTECTED ao editar grupo do sistema', async () => {
    const created = await userGroupInMemoryRepository.create({
      name: 'Master',
      slug: 'MASTER',
      permissions: ['permission-1'],
    });

    const result = await sut.execute({
      _id: created._id,
      name: 'Renomeado',
      permissions: ['permission-1'],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(403);
    expect(result.value.cause).toBe('SYSTEM_GROUP_PROTECTED');
  });

  it('deve retornar erro quando nao informar permissoes', async () => {
    const created = await userGroupInMemoryRepository.create({
      name: 'Grupo',
      slug: 'grupo',
      permissions: ['permission-1'],
    });

    const result = await sut.execute({
      _id: created._id,
      permissions: [],
      description: 'Group description',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(400);
    expect(result.value.message).toBe(
      'Ao menos uma permissão deve ser informada para o grupo de usuários',
    );
  });

  it('deve retornar GROUP_SELF_REFERENCE quando o grupo engloba a si mesmo', async () => {
    const created = await userGroupInMemoryRepository.create({
      name: 'Vendas',
      slug: 'vendas',
      permissions: ['permission-1'],
    });

    const result = await sut.execute({
      _id: created._id,
      encompasses: [created._id],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('GROUP_SELF_REFERENCE');
  });

  it('deve retornar GROUP_CYCLE_DETECTED quando criar ciclo transitivo', async () => {
    const groupA = await userGroupInMemoryRepository.create({
      name: 'Grupo A',
      slug: 'grupo-a',
      permissions: ['permission-1'],
    });
    const groupB = await userGroupInMemoryRepository.create({
      name: 'Grupo B',
      slug: 'grupo-b',
      permissions: ['permission-1'],
      encompasses: [groupA._id],
    });

    // A passa a englobar B, que ja engloba A -> ciclo A -> B -> A.
    const result = await sut.execute({
      _id: groupA._id,
      encompasses: [groupB._id],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('GROUP_CYCLE_DETECTED');
  });

  it('deve aceitar encompasses sem ciclo', async () => {
    const registered = await userGroupInMemoryRepository.create({
      name: 'Registered',
      slug: 'registered-custom',
      permissions: ['permission-1'],
    });
    const manager = await userGroupInMemoryRepository.create({
      name: 'Gerentes',
      slug: 'gerentes',
      permissions: ['permission-1'],
    });

    const result = await sut.execute({
      _id: manager._id,
      encompasses: [registered._id],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.encompasses).toEqual([registered._id]);
  });

  it('deve retornar erro UPDATE_USER_GROUP_ERROR quando houver falha', async () => {
    userGroupInMemoryRepository.simulateError(
      'findById',
      new Error('Database error'),
    );

    const result = await sut.execute({
      _id: 'some-id',
      permissions: ['permission-1'],
      description: 'Group description',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('UPDATE_USER_GROUP_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
