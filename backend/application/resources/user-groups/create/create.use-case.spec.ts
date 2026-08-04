import { beforeEach, describe, expect, it } from 'vitest';

import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import SlugService from '@application/services/slug/slug.service';

import UserGroupCreateUseCase from './create.use-case';

let userGroupInMemoryRepository: UserGroupInMemoryRepository;
let sut: UserGroupCreateUseCase;

describe('UserGroup Create Use Case', () => {
  beforeEach(() => {
    userGroupInMemoryRepository = new UserGroupInMemoryRepository();
    sut = new UserGroupCreateUseCase(
      userGroupInMemoryRepository,
      new SlugService(),
    );
  });

  it('deve criar um grupo de usuarios com sucesso', async () => {
    const result = await sut.execute({
      name: 'Administradores',
      description: 'Grupo de administradores',
      permissions: ['permission-1', 'permission-2'],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.name).toBe('Administradores');
    expect(result.value.slug).toBe('administradores');
    expect(result.value.permissions).toHaveLength(2);

    const persisted =
      await userGroupInMemoryRepository.findBySlug('administradores');
    expect(persisted).not.toBeNull();
    expect(persisted?.name).toBe('Administradores');
  });

  it('deve retornar erro GROUP_EXISTS quando slug ja existe', async () => {
    await userGroupInMemoryRepository.create({
      name: 'Existing Group',
      slug: 'existing-group',
      permissions: ['permission-1'],
    });

    const result = await sut.execute({
      name: 'Existing Group',
      permissions: ['permission-1'],
      description: 'Group description',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('GROUP_EXISTS');
    expect(result.value.message).toBe('Grupo já existe');
  });

  it('deve retornar erro quando nao informar permissoes', async () => {
    const result = await sut.execute({
      name: 'Grupo sem permissoes',
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

  it('deve retornar erro CREATE_USER_GROUP_ERROR quando houver falha', async () => {
    userGroupInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      name: 'Grupo',
      permissions: ['permission-1'],
      description: 'Group description',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('CREATE_USER_GROUP_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
