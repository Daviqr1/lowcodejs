import { beforeEach, describe, expect, it } from 'vitest';

import { E_PERMISSION_TARGET, E_ROLE } from '@application/core/entity.core';
import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';
import PermissionService from '@application/services/permission/permission.service';

import MenuListUseCase from './list.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let userInMemoryRepository: UserInMemoryRepository;
let tableInMemoryRepository: TableInMemoryRepository;
let userGroupInMemoryRepository: UserGroupInMemoryRepository;
let permissionService: PermissionService;
let groupResolver: GroupResolverService;
let sut: MenuListUseCase;

describe('Menu List Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    userInMemoryRepository = new UserInMemoryRepository();
    tableInMemoryRepository = new TableInMemoryRepository();
    userGroupInMemoryRepository = new UserGroupInMemoryRepository();
    groupResolver = new GroupResolverService(userGroupInMemoryRepository);
    permissionService = new PermissionService(groupResolver);
    sut = new MenuListUseCase(
      menuInMemoryRepository,
      userInMemoryRepository,
      tableInMemoryRepository,
      permissionService,
      groupResolver,
    );
  });

  it('deve retornar lista vazia quando nao houver menus', async () => {
    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('deve retornar lista de menus quando existirem', async () => {
    for (let i = 0; i < 5; i++) {
      await menuInMemoryRepository.create({
        name: `Menu ${i + 1}`,
        slug: `menu-${i + 1}`,
        type: 'PAGE',
      });
    }

    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toHaveLength(5);
    }
  });

  it('deve retornar apenas menus nao deletados', async () => {
    const menu1 = await menuInMemoryRepository.create({
      name: 'Menu 1',
      slug: 'menu-1',
      type: 'PAGE',
    });

    await menuInMemoryRepository.create({
      name: 'Menu 2',
      slug: 'menu-2',
      type: 'PAGE',
    });

    await menuInMemoryRepository.delete(menu1._id);

    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].name).toBe('Menu 2');
    }
  });

  it('deve ocultar menu TABLE quando usuario nao tem VIEW da tabela', async () => {
    const user = await userInMemoryRepository.create({
      name: 'Registrado',
      email: 'reg@reg.com',
      password: 'x',
      group: 'group-registered',
      groups: [],
    });

    const table = await tableInMemoryRepository.create({
      name: 'Financeiro',
      slug: 'financeiro',
      owner: 'outro-dono',
      permissions: {
        VIEW_TABLE: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
      },
    });

    await menuInMemoryRepository.create({
      name: 'Financeiro',
      slug: 'financeiro',
      type: 'TABLE',
      table: table._id,
    });
    await menuInMemoryRepository.create({
      name: 'Pagina',
      slug: 'pagina',
      type: 'PAGE',
    });

    const result = await sut.execute({
      actorUserId: user._id,
      role: 'REGISTERED',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value).toHaveLength(1);
    expect(result.value[0].name).toBe('Pagina');
  });

  it('deve exibir menu TABLE quando a tabela tem VIEW publico', async () => {
    const user = await userInMemoryRepository.create({
      name: 'Registrado',
      email: 'reg2@reg.com',
      password: 'x',
      group: 'group-registered',
      groups: [],
    });

    const table = await tableInMemoryRepository.create({
      name: 'Filiais',
      slug: 'filiais',
      owner: 'outro-dono',
      permissions: {
        VIEW_TABLE: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
      },
    });

    await menuInMemoryRepository.create({
      name: 'Filiais',
      slug: 'filiais',
      type: 'TABLE',
      table: table._id,
    });

    const result = await sut.execute({
      actorUserId: user._id,
      role: 'REGISTERED',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value).toHaveLength(1);
    expect(result.value[0].name).toBe('Filiais');
  });

  it('privilegiado via grupo secundário (groups[]) enxerga menu de visibilidade NOBODY', async () => {
    // Regressão do bug do novo RBAC: privilégio derivava apenas do grupo
    // principal (singular). Um usuário MASTER/ADMINISTRATOR por grupo adicional
    // perdia o bypass — agora o fecho de grupos é a fonte de verdade.
    const masterGroup = await userGroupInMemoryRepository.create({
      name: 'Master',
      slug: E_ROLE.MASTER,
      permissions: [],
      encompasses: [],
    });
    const user = await userInMemoryRepository.create({
      name: 'Admin Secundario',
      email: 'sec@x.com',
      password: 'x',
      group: 'group-comum',
      groups: [masterGroup._id],
    });

    await menuInMemoryRepository.create({
      name: 'Oculto',
      slug: 'oculto',
      type: 'PAGE',
      visibility: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
    });

    const result = await sut.execute({
      actorUserId: user._id,
      role: 'REGISTERED',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value).toHaveLength(1);
    expect(result.value[0].name).toBe('Oculto');
  });

  it('deve retornar erro LIST_MENU_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'findMany',
      new Error('Database error'),
    );

    const result = await sut.execute();

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('LIST_MENU_ERROR');
    }
  });
});
