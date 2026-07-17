import { beforeEach, describe, expect, it } from 'vitest';

import {
  E_PERMISSION_TARGET,
  E_TABLE_PERMISSION,
  type IGroup,
  type IPermission,
  type ITable,
  type IUser,
} from '@application/core/entity.core';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';

import PermissionService from './permission.service';

function buildPermission(slug: string): IPermission {
  return {
    _id: slug,
    name: slug,
    slug,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    trashed: false,
    trashedAt: null,
  };
}

function buildGroup(id: string, permissionSlugs: Array<string>): IGroup {
  return {
    _id: id,
    name: id,
    slug: id,
    description: null,
    permissions: permissionSlugs.map(buildPermission),
    encompasses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    trashed: false,
    trashedAt: null,
  };
}

let userGroupRepository: UserGroupInMemoryRepository;
let userRepository: UserInMemoryRepository;
let tableRepository: TableInMemoryRepository;
let groupResolver: GroupResolverService;
let sut: PermissionService;

describe('Permission Service — interseção grupo E tabela', () => {
  beforeEach(() => {
    userGroupRepository = new UserGroupInMemoryRepository();
    userRepository = new UserInMemoryRepository();
    tableRepository = new TableInMemoryRepository();
    groupResolver = new GroupResolverService(userGroupRepository);
    sut = new PermissionService(groupResolver);
  });

  async function createUserInGroup(groupId: string): Promise<IUser> {
    return userRepository.create({
      name: 'Membro',
      email: `${groupId}@x.com`,
      password: 'x',
      group: groupId,
      groups: [],
    });
  }

  async function createTableForGroup(
    binding: ITable['permissions'],
  ): Promise<ITable> {
    return tableRepository.create({
      name: 'Financeiro',
      slug: 'financeiro',
      owner: 'outro-dono',
      permissions: binding,
    });
  }

  it('GROUP libera quando o grupo tem a capacidade global da ação', async () => {
    userGroupRepository.items.push(
      buildGroup('vendas', [E_TABLE_PERMISSION.VIEW_ROW]),
    );
    const user = await createUserInGroup('vendas');
    const table = await createTableForGroup({
      VIEW_ROW: { kind: E_PERMISSION_TARGET.GROUP, group: 'vendas' },
    });

    const result = await sut.checkTableAccess({
      table,
      userId: user._id,
      userRole: 'REGISTERED',
      user,
      requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
      httpMethod: 'GET',
    });

    expect(result.allowed).toBe(true);
  });

  it('GROUP nega quando o grupo NÃO tem a capacidade global (interseção)', async () => {
    userGroupRepository.items.push(buildGroup('vendas', []));
    const user = await createUserInGroup('vendas');
    const table = await createTableForGroup({
      VIEW_ROW: { kind: E_PERMISSION_TARGET.GROUP, group: 'vendas' },
    });

    await expect(
      sut.checkTableAccess({
        table,
        userId: user._id,
        userRole: 'REGISTERED',
        user,
        requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
        httpMethod: 'GET',
      }),
    ).rejects.toMatchObject({ cause: 'INSUFFICIENT_PERMISSIONS' });
  });

  it('PUBLIC libera mesmo sem a capacidade global (sem interseção)', async () => {
    userGroupRepository.items.push(buildGroup('vendas', []));
    const user = await createUserInGroup('vendas');
    const table = await createTableForGroup({
      VIEW_ROW: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
    });

    const result = await sut.checkTableAccess({
      table,
      userId: user._id,
      userRole: 'REGISTERED',
      user,
      requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
      httpMethod: 'GET',
    });

    expect(result.allowed).toBe(true);
  });

  it('CREATE_TABLE usa só a capacidade do grupo (sem tabela)', async () => {
    userGroupRepository.items.push(
      buildGroup('criadores', [E_TABLE_PERMISSION.CREATE_TABLE]),
    );
    const user = await createUserInGroup('criadores');

    const result = await sut.checkTableAccess({
      table: undefined,
      userId: user._id,
      userRole: 'REGISTERED',
      user,
      requiredPermission: E_TABLE_PERMISSION.CREATE_TABLE,
      httpMethod: 'POST',
    });

    expect(result.allowed).toBe(true);
  });

  it('CREATE_TABLE nega quando o grupo não tem a capacidade', async () => {
    userGroupRepository.items.push(buildGroup('comum', []));
    const user = await createUserInGroup('comum');

    await expect(
      sut.checkTableAccess({
        table: undefined,
        userId: user._id,
        userRole: 'REGISTERED',
        user,
        requiredPermission: E_TABLE_PERMISSION.CREATE_TABLE,
        httpMethod: 'POST',
      }),
    ).rejects.toMatchObject({ cause: 'INSUFFICIENT_PERMISSIONS' });
  });
});
