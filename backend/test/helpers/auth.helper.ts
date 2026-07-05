import bcrypt from 'bcryptjs';
import supertest from 'supertest';

import {
  E_AREA_CAPABILITY,
  E_TABLE_PERMISSION,
  E_USER_STATUS,
} from '@application/core/entity.core';
import { Permission } from '@application/model/permission.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';

export type AuthenticatedUser = {
  user: { _id: string; email: string; name: string };
  cookies: string[];
  permissions: string[];
};

export async function createAuthenticatedUser(
  overrides?: Partial<{ email: string; password: string; name: string }>,
): Promise<AuthenticatedUser> {
  const password = overrides?.password ?? 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  let group = await UserGroup.findOne({ slug: 'master' });

  const permissions = await Permission.insertMany([
    {
      name: 'Create table',
      slug: E_TABLE_PERMISSION.CREATE_TABLE,
      description: 'Allows creating a new table',
    },
    {
      name: 'Update table',
      slug: E_TABLE_PERMISSION.UPDATE_TABLE,
      description: 'Allows updating data of an existing table.',
    },
    {
      name: 'Remove table',
      slug: E_TABLE_PERMISSION.REMOVE_TABLE,
      description: 'Allows removing or deleting existing tables.',
    },
    {
      name: 'View table',
      slug: E_TABLE_PERMISSION.VIEW_TABLE,
      description: 'Allows viewing and listening existing tables',
    },
    {
      name: 'Create field',
      slug: E_TABLE_PERMISSION.CREATE_FIELD,
      description: 'Allows creating a field in an existing table',
    },
    {
      name: 'Update field',
      slug: E_TABLE_PERMISSION.UPDATE_FIELD,
      description: 'Allows updating field data in an existing table',
    },
    {
      name: 'Remove field',
      slug: E_TABLE_PERMISSION.REMOVE_FIELD,
      description: 'Allows removing or deleting fields from an existing table.',
    },
    {
      name: 'View field',
      slug: E_TABLE_PERMISSION.VIEW_FIELD,
      description:
        'Allows viewing and listening fields from an existing table.',
    },
    {
      name: 'Create row',
      slug: E_TABLE_PERMISSION.CREATE_ROW,
      description: 'Allows creating new rows in an existing table',
    },
    {
      name: 'Update row',
      slug: E_TABLE_PERMISSION.UPDATE_ROW,
      description: 'Allows updating row data in an existing table.',
    },
    {
      name: 'Remove row',
      slug: E_TABLE_PERMISSION.REMOVE_ROW,
      description: 'Allows removing rows from an existing table.',
    },
    {
      name: 'View row',
      slug: E_TABLE_PERMISSION.VIEW_ROW,
      description: 'Allows viewing and listening rows from an existing table.',
    },
    {
      name: 'Gerenciar usuários',
      slug: E_AREA_CAPABILITY.MANAGE_USERS,
      description: 'Gerencia a área de usuários',
    },
    {
      name: 'Gerenciar menu',
      slug: E_AREA_CAPABILITY.MANAGE_MENU,
      description: 'Gerencia a área de menu',
    },
    {
      name: 'Gerenciar grupos de usuários',
      slug: E_AREA_CAPABILITY.MANAGE_USER_GROUPS,
      description: 'Gerencia a área de grupos de usuários',
    },
    {
      name: 'Gerenciar configurações',
      slug: E_AREA_CAPABILITY.MANAGE_SETTINGS,
      description: 'Gerencia a área de configurações',
    },
    {
      name: 'Gerenciar ferramentas',
      slug: E_AREA_CAPABILITY.MANAGE_TOOLS,
      description: 'Gerencia a área de ferramentas',
    },
    {
      name: 'Gerenciar plugins',
      slug: E_AREA_CAPABILITY.MANAGE_PLUGINS,
      description: 'Gerencia a área de plugins',
    },
  ]);

  if (!group) {
    group = await UserGroup.create({
      name: 'Master',
      slug: 'master',
      permissions: permissions.flatMap((p) => p._id),
    });
  }

  const user = await User.create({
    name: overrides?.name ?? 'Test User',
    email: overrides?.email ?? `test-${Date.now()}@example.com`,
    password: hashedPassword,
    status: E_USER_STATUS.ACTIVE,
    group: group._id,
    groups: [group._id],
  });

  const response = await supertest(kernel.server)
    .post('/authentication/sign-in')
    .send({ email: user.email, password });

  const setCookie = response.headers['set-cookie'];
  let cookies: string[] = [];
  if (Array.isArray(setCookie)) cookies = setCookie;
  if (!Array.isArray(setCookie) && setCookie) cookies = [setCookie];

  return {
    user: { _id: user._id.toString(), email: user.email, name: user.name },
    cookies,
    permissions: permissions.map((p) => p._id.toString()),
  };
}

type GroupUserOptions = {
  groupSlug: string;
  groupName: string;
  permissionSlugs: string[];
  email?: string;
  password?: string;
  name?: string;
};

// Cria um usuario autenticado num grupo nao-MASTER com um conjunto explicito de
// permissoes. Usado pelos testes de NEGACAO (403): o slug do grupo deriva o
// `role` no JWT (jwt.util: group.slug.toUpperCase()), e `permissionSlugs` define
// as capacidades no fecho. Permissoes sao upsertadas por slug para nao duplicar.
export async function createAuthenticatedUserInGroup(
  options: GroupUserOptions,
): Promise<AuthenticatedUser> {
  const password = options.password ?? 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const permissionIds: string[] = [];
  for (const slug of options.permissionSlugs) {
    let permission = await Permission.findOne({ slug });
    if (!permission) {
      permission = await Permission.create({
        name: slug,
        slug,
        description: slug,
      });
    }
    permissionIds.push(permission._id.toString());
  }

  const group = await UserGroup.create({
    name: options.groupName,
    slug: options.groupSlug,
    permissions: permissionIds,
  });

  const user = await User.create({
    name: options.name ?? 'Restricted User',
    email: options.email ?? `restricted-${Date.now()}@example.com`,
    password: hashedPassword,
    status: E_USER_STATUS.ACTIVE,
    group: group._id,
    groups: [group._id],
  });

  const response = await supertest(kernel.server)
    .post('/authentication/sign-in')
    .send({ email: user.email, password });

  const cookies = normalizeSetCookie(response.headers['set-cookie']);

  return {
    user: { _id: user._id.toString(), email: user.email, name: user.name },
    cookies,
    permissions: permissionIds,
  };
}

function normalizeSetCookie(
  setCookie: string | string[] | undefined,
): string[] {
  if (Array.isArray(setCookie)) return setCookie;
  if (setCookie) return [setCookie];
  return [];
}

export async function cleanDatabase(): Promise<void> {
  await User.deleteMany({});
  await UserGroup.deleteMany({});
}
