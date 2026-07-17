import {
  E_AREA_CAPABILITY,
  E_TABLE_PERMISSION,
  IPermission,
  Merge,
  ValueOf,
} from '@application/core/entity.core';
import { Permission } from '@application/model/permission.model';

import { TaskLogger } from '../shared/task-logger';

export type PayloadPermissionSeeder = Merge<
  Pick<IPermission, 'name' | 'description'>,
  {
    slug:
      | ValueOf<typeof E_TABLE_PERMISSION>
      | ValueOf<typeof E_AREA_CAPABILITY>;
  }
>;

export default async function Seed(): Promise<void> {
  const PAYLOAD_PERMISSION_SEEDER: PayloadPermissionSeeder[] = [
    {
      name: 'Criar tabela',
      slug: E_TABLE_PERMISSION.CREATE_TABLE,
      description: 'Permite criar uma nova tabela',
    },
    {
      name: 'Editar tabela',
      slug: E_TABLE_PERMISSION.UPDATE_TABLE,
      description: 'Permite editar dados de uma tabela existente',
    },
    {
      name: 'Remover tabela',
      slug: E_TABLE_PERMISSION.REMOVE_TABLE,
      description: 'Permite remover ou excluir tabelas existentes',
    },
    {
      name: 'Visualizar tabela',
      slug: E_TABLE_PERMISSION.VIEW_TABLE,
      description: 'Permite visualizar tabelas existentes',
    },
    {
      name: 'Criar campo',
      slug: E_TABLE_PERMISSION.CREATE_FIELD,
      description: 'Permite criar um campo em uma tabela existente',
    },
    {
      name: 'Editar campo',
      slug: E_TABLE_PERMISSION.UPDATE_FIELD,
      description: 'Permite editar dados de um campo em uma tabela existente',
    },
    {
      name: 'Remover campo',
      slug: E_TABLE_PERMISSION.REMOVE_FIELD,
      description: 'Permite remover ou excluir campos de uma tabela existente',
    },
    {
      name: 'Visualizar campo',
      slug: E_TABLE_PERMISSION.VIEW_FIELD,
      description: 'Permite visualizar campos de uma tabela existente',
    },
    {
      name: 'Criar registro',
      slug: E_TABLE_PERMISSION.CREATE_ROW,
      description: 'Permite criar novos registros em uma tabela existente',
    },
    {
      name: 'Editar registro',
      slug: E_TABLE_PERMISSION.UPDATE_ROW,
      description:
        'Permite editar dados de um registro em uma tabela existente',
    },
    {
      name: 'Remover registro',
      slug: E_TABLE_PERMISSION.REMOVE_ROW,
      description: 'Permite remover registros de uma tabela existente',
    },
    {
      name: 'Visualizar registro',
      slug: E_TABLE_PERMISSION.VIEW_ROW,
      description: 'Permite visualizar registros de uma tabela existente',
    },
    // Capacidades de area do sistema (antes gateadas por role fixo).
    {
      name: 'Gerenciar usuários',
      slug: E_AREA_CAPABILITY.MANAGE_USERS,
      description: 'Permite gerenciar os usuários do sistema',
    },
    {
      name: 'Gerenciar menu',
      slug: E_AREA_CAPABILITY.MANAGE_MENU,
      description: 'Permite gerenciar as opções de menu',
    },
    {
      name: 'Gerenciar grupos de usuários',
      slug: E_AREA_CAPABILITY.MANAGE_USER_GROUPS,
      description: 'Permite gerenciar os grupos de usuários e suas permissões',
    },
    {
      name: 'Gerenciar configurações',
      slug: E_AREA_CAPABILITY.MANAGE_SETTINGS,
      description: 'Permite gerenciar as configurações do sistema',
    },
    {
      name: 'Gerenciar ferramentas',
      slug: E_AREA_CAPABILITY.MANAGE_TOOLS,
      description: 'Permite gerenciar as ferramentas (extensões do tipo tool)',
    },
    {
      name: 'Gerenciar plugins',
      slug: E_AREA_CAPABILITY.MANAGE_PLUGINS,
      description: 'Permite gerenciar os plugins',
    },
    {
      name: 'Usar o assistente de IA',
      slug: E_AREA_CAPABILITY.MANAGE_CHAT,
      description: 'Permite usar o chat do assistente de IA',
    },
  ];

  await Permission.bulkWrite(
    PAYLOAD_PERMISSION_SEEDER.map(({ slug, ...rest }) => ({
      updateOne: {
        filter: { slug },
        update: { $set: { slug, ...rest } },
        upsert: true,
      },
    })),
  );
  new TaskLogger('Permissões').ok();
}
