import {
  E_AREA_CAPABILITY,
  E_ROLE,
  E_TABLE_PERMISSION,
  ValueOf,
} from '@application/core/entity.core';
import { Permission } from '@application/model/permission.model';
import { UserGroup } from '@application/model/user-group.model';

import { TaskLogger } from '../shared/task-logger';

type GroupMetadata = {
  name: string;
  slug: ValueOf<typeof E_ROLE>;
  description: string;
};

const GROUP_METADATA: GroupMetadata[] = [
  {
    name: 'Master',
    slug: E_ROLE.MASTER,
    description:
      'Acesso total ao sistema - gerencia tudo, incluindo configurações do sistema',
  },
  {
    name: 'Administrator',
    slug: E_ROLE.ADMINISTRATOR,
    description:
      'Gerenciamento total de tabelas - gerencia todas as tabelas, campos e registros',
  },
  {
    name: 'Manager',
    slug: E_ROLE.MANAGER,
    description:
      'Cria suas próprias tabelas e gerencia tabelas onde é proprietário ou administrador. Pode visualizar e criar registros em todas as tabelas acessíveis',
  },
  {
    name: 'Registered',
    slug: E_ROLE.REGISTERED,
    description:
      'Pode visualizar tabelas e criar registros (respeitando visibilidade). Gerencia apenas tabelas onde é administrador',
  },
];

const MANAGER_PERMISSIONS: ValueOf<typeof E_TABLE_PERMISSION>[] = [
  E_TABLE_PERMISSION.CREATE_TABLE,
  E_TABLE_PERMISSION.UPDATE_TABLE,
  E_TABLE_PERMISSION.REMOVE_TABLE,
  E_TABLE_PERMISSION.VIEW_TABLE,
  E_TABLE_PERMISSION.CREATE_FIELD,
  E_TABLE_PERMISSION.UPDATE_FIELD,
  E_TABLE_PERMISSION.REMOVE_FIELD,
  E_TABLE_PERMISSION.VIEW_FIELD,
  E_TABLE_PERMISSION.CREATE_ROW,
  E_TABLE_PERMISSION.UPDATE_ROW,
  E_TABLE_PERMISSION.REMOVE_ROW,
  E_TABLE_PERMISSION.VIEW_ROW,
];

const REGISTERED_PERMISSIONS: ValueOf<typeof E_TABLE_PERMISSION>[] = [
  E_TABLE_PERMISSION.VIEW_TABLE,
  E_TABLE_PERMISSION.VIEW_FIELD,
  E_TABLE_PERMISSION.VIEW_ROW,
  E_TABLE_PERMISSION.CREATE_ROW,
];

// Capacidades de area por grupo, conforme a especificacao (aba 060226-Oficial):
// Master tem todas; Administrator gerencia Usuarios e Menu, mas nao Grupos,
// Configuracoes, Ferramentas nem Plugins; Manager/Registered nenhuma.
const MASTER_CAPABILITIES: ValueOf<typeof E_AREA_CAPABILITY>[] =
  Object.values(E_AREA_CAPABILITY);

const ADMINISTRATOR_CAPABILITIES: ValueOf<typeof E_AREA_CAPABILITY>[] = [
  E_AREA_CAPABILITY.MANAGE_USERS,
  E_AREA_CAPABILITY.MANAGE_MENU,
];

// Chat liberado a todos os grupos por padrao (mantem o comportamento antigo de
// "qualquer logado usa o chat"), agora revogavel por grupo via permissao.
const CHAT_CAPABILITIES: ValueOf<typeof E_AREA_CAPABILITY>[] = [
  E_AREA_CAPABILITY.MANAGE_CHAT,
];

// Hierarquia fixa dos grupos de sistema (Master engloba Administrator, e assim
// por diante). Como sao grupos do sistema, a hierarquia e definida pelo codigo.
const ENCOMPASSES_BY_SLUG: Record<
  ValueOf<typeof E_ROLE>,
  ValueOf<typeof E_ROLE>[]
> = {
  [E_ROLE.MASTER]: [E_ROLE.ADMINISTRATOR],
  [E_ROLE.ADMINISTRATOR]: [E_ROLE.MANAGER],
  [E_ROLE.MANAGER]: [E_ROLE.REGISTERED],
  [E_ROLE.REGISTERED]: [],
};

export default async function Seed(): Promise<void> {
  const permissions = await Permission.find({ trashed: false });

  const permissionIdBySlug = new Map<string, unknown>();
  for (const permission of permissions) {
    permissionIdBySlug.set(permission.slug, permission._id);
  }

  const idsForSlugs = (slugs: string[]): unknown[] =>
    slugs.flatMap((slug) => {
      const id = permissionIdBySlug.get(slug);
      if (!id) return [];
      return [id];
    });

  const permissionsBySlug: Record<string, unknown[]> = {
    [E_ROLE.MASTER]: permissions.map((p) => p._id),
    [E_ROLE.ADMINISTRATOR]: idsForSlugs([
      ...MANAGER_PERMISSIONS,
      ...ADMINISTRATOR_CAPABILITIES,
      ...CHAT_CAPABILITIES,
    ]),
    [E_ROLE.MANAGER]: idsForSlugs([
      ...MANAGER_PERMISSIONS,
      ...CHAT_CAPABILITIES,
    ]),
    [E_ROLE.REGISTERED]: idsForSlugs([
      ...REGISTERED_PERMISSIONS,
      ...CHAT_CAPABILITIES,
    ]),
  };

  const ops = GROUP_METADATA.map(({ slug, name, description }) => ({
    updateOne: {
      filter: { slug },
      update: {
        $set: { slug, name, description },
        $setOnInsert: { permissions: permissionsBySlug[slug] ?? [] },
      },
      upsert: true,
    },
  }));

  // @ts-expect-error IGroup.permissions é tipado como IPermission[] (populado), mas o schema guarda ObjectId[]
  await UserGroup.bulkWrite(ops);

  // Segundo passo (idempotente, cobre instalações já existentes):
  // 1. Fixa a hierarquia `encompasses` dos grupos de sistema (code-owned).
  // 2. Garante as capacidades de área em Master/Administrator de forma aditiva
  //    ($addToSet preserva permissões customizadas manualmente).
  const groups = await UserGroup.find({
    slug: { $in: Object.values(E_ROLE) },
  });

  const groupIdBySlug = new Map<string, unknown>();
  for (const group of groups) {
    groupIdBySlug.set(group.slug, group._id);
  }

  const encompassesOps = GROUP_METADATA.map(({ slug }) => ({
    updateOne: {
      filter: { slug },
      update: {
        $set: {
          encompasses: ENCOMPASSES_BY_SLUG[slug].flatMap((target) => {
            const id = groupIdBySlug.get(target);
            if (!id) return [];
            return [id];
          }),
        },
      },
    },
  }));

  const capabilityOps = [
    { slug: E_ROLE.MASTER, capabilities: MASTER_CAPABILITIES },
    {
      slug: E_ROLE.ADMINISTRATOR,
      capabilities: [...ADMINISTRATOR_CAPABILITIES, ...CHAT_CAPABILITIES],
    },
    { slug: E_ROLE.MANAGER, capabilities: CHAT_CAPABILITIES },
    { slug: E_ROLE.REGISTERED, capabilities: CHAT_CAPABILITIES },
  ].map(({ slug, capabilities }) => ({
    updateOne: {
      filter: { slug },
      update: {
        $addToSet: { permissions: { $each: idsForSlugs(capabilities) } },
      },
    },
  }));

  // @ts-expect-error encompasses/permissions guardam ObjectId[] no schema
  await UserGroup.bulkWrite([...encompassesOps, ...capabilityOps]);
  new TaskLogger('Grupos de usuários').ok();
}
