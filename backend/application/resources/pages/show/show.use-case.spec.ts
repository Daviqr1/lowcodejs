import { beforeEach, describe, expect, it } from 'vitest';

import { E_PERMISSION_TARGET, E_ROLE } from '@application/core/entity.core';
import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';

import PageShowUseCase from './show.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let userInMemoryRepository: UserInMemoryRepository;
let userGroupInMemoryRepository: UserGroupInMemoryRepository;
let groupResolver: GroupResolverService;
let sut: PageShowUseCase;

describe('Page Show Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    userInMemoryRepository = new UserInMemoryRepository();
    userGroupInMemoryRepository = new UserGroupInMemoryRepository();
    groupResolver = new GroupResolverService(userGroupInMemoryRepository);
    sut = new PageShowUseCase(
      menuInMemoryRepository,
      userInMemoryRepository,
      groupResolver,
    );
  });

  it('deve retornar uma pagina existente pelo slug (binding ausente = visivel)', async () => {
    await menuInMemoryRepository.create({
      name: 'Dashboard',
      slug: 'dashboard',
      type: 'PAGE',
    });

    const result = await sut.execute({ slug: 'dashboard' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.name).toBe('Dashboard');
    expect(result.value.slug).toBe('dashboard');
  });

  it('deve retornar pagina com visibilidade PUBLIC para visitante', async () => {
    await menuInMemoryRepository.create({
      name: 'Publica',
      slug: 'publica',
      type: 'PAGE',
      visibility: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
    });

    const result = await sut.execute({ slug: 'publica' });

    expect(result.isRight()).toBe(true);
  });

  it('deve esconder (404) pagina com visibilidade NOBODY', async () => {
    await menuInMemoryRepository.create({
      name: 'Secreta',
      slug: 'secreta',
      type: 'PAGE',
      visibility: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
    });

    const result = await sut.execute({ slug: 'secreta', role: E_ROLE.MANAGER });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('PAGE_NOT_FOUND');
  });

  it('deve permitir MASTER ver pagina NOBODY (bypass)', async () => {
    await menuInMemoryRepository.create({
      name: 'Secreta',
      slug: 'secreta',
      type: 'PAGE',
      visibility: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
    });

    const master = await userGroupInMemoryRepository.create({
      name: 'Master',
      slug: E_ROLE.MASTER,
      permissions: [],
      encompasses: [],
    });
    const user = await userInMemoryRepository.create({
      name: 'Master',
      email: 'master@x.com',
      password: 'x',
      group: master._id,
    });

    const result = await sut.execute({
      slug: 'secreta',
      actorUserId: user._id,
    });

    expect(result.isRight()).toBe(true);
  });

  it('deve exibir pagina GROUP para membro do grupo', async () => {
    const group = await userGroupInMemoryRepository.create({
      name: 'Vendas',
      slug: 'vendas',
      permissions: [],
      encompasses: [],
    });

    const user = await userInMemoryRepository.create({
      name: 'Membro',
      email: 'membro@vendas.com',
      password: 'x',
      group: group._id,
      groups: [],
    });

    await menuInMemoryRepository.create({
      name: 'Restrita',
      slug: 'restrita',
      type: 'PAGE',
      visibility: { kind: E_PERMISSION_TARGET.GROUP, group: group._id },
    });

    const result = await sut.execute({
      slug: 'restrita',
      actorUserId: user._id,
      role: E_ROLE.REGISTERED,
    });

    expect(result.isRight()).toBe(true);
  });

  it('deve esconder (404) pagina GROUP para quem nao esta no grupo', async () => {
    const group = await userGroupInMemoryRepository.create({
      name: 'Vendas',
      slug: 'vendas',
      permissions: [],
      encompasses: [],
    });

    const other = await userGroupInMemoryRepository.create({
      name: 'Outro',
      slug: 'outro',
      permissions: [],
      encompasses: [],
    });

    const user = await userInMemoryRepository.create({
      name: 'Forasteiro',
      email: 'fora@outro.com',
      password: 'x',
      group: other._id,
      groups: [],
    });

    await menuInMemoryRepository.create({
      name: 'Restrita',
      slug: 'restrita',
      type: 'PAGE',
      visibility: { kind: E_PERMISSION_TARGET.GROUP, group: group._id },
    });

    const result = await sut.execute({
      slug: 'restrita',
      actorUserId: user._id,
      role: E_ROLE.REGISTERED,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('PAGE_NOT_FOUND');
  });

  it('deve retornar erro PAGE_NOT_FOUND quando pagina nao existe', async () => {
    const result = await sut.execute({ slug: 'non-existent' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('PAGE_NOT_FOUND');
    expect(result.value.message).toBe('Página não encontrada');
  });

  it('deve retornar erro GET_MENU_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({ slug: 'some-slug' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('GET_MENU_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
