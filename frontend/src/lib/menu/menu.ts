import {
  GroupIcon,
  HistoryIcon,
  MenuIcon,
  PuzzleIcon,
  SettingsIcon,
  TableIcon,
  TriangleAlertIcon,
  UserIcon,
  UsersIcon,
  WrenchIcon,
} from 'lucide-react';

import type { MenuItem, MenuRoute } from './menu-route';

import { E_AREA_CAPABILITY } from '@/lib/constant';
import { hasAreaCapability } from '@/lib/menu/menu-access-permissions';

// Itens de area do sistema com a capacidade que os libera. Itens sem capacidade
// (Tabelas, Histórico, Perfil) sao sempre visiveis para o autenticado.
// eslint-disable-next-line lowcodejs/no-type-intersection -- MenuItem é união discriminada (CollapsibleItem | LinkItem); Merge mapearia keyof e destruiria a união
type CapabilityMenuItem = MenuItem & { capability?: string };

const SYSTEM_ITEMS: Array<CapabilityMenuItem> = [
  { title: 'Tabelas', url: '/tables', icon: TableIcon },
  {
    title: 'Configurações',
    url: '/settings',
    icon: SettingsIcon,
    capability: E_AREA_CAPABILITY.MANAGE_SETTINGS,
  },
  {
    title: 'Menus',
    url: '/menus',
    icon: MenuIcon,
    capability: E_AREA_CAPABILITY.MANAGE_MENU,
  },
  {
    title: 'Grupos',
    url: '/groups',
    icon: GroupIcon,
    capability: E_AREA_CAPABILITY.MANAGE_USER_GROUPS,
  },
  {
    title: 'Usuários',
    url: '/users',
    icon: UsersIcon,
    capability: E_AREA_CAPABILITY.MANAGE_USERS,
  },
  {
    title: 'Ferramentas',
    url: '/tools',
    icon: WrenchIcon,
    capability: E_AREA_CAPABILITY.MANAGE_TOOLS,
  },
  {
    title: 'Extensões',
    url: '/extensions',
    icon: PuzzleIcon,
    capability: E_AREA_CAPABILITY.MANAGE_TOOLS,
  },
];

const HISTORY_ITEMS: Array<MenuItem> = [
  { title: 'Ações dos usuários', url: '/logs', icon: HistoryIcon },
  { title: 'Erros do sistema', url: '/error-logs', icon: TriangleAlertIcon },
];

// Monta os menus estaticos a partir das capacidades resolvidas do usuario, nao
// do role legado: um grupo custom com MANAGE_* libera a area correspondente.
export const getStaticMenusByCapabilities = (
  capabilities: Array<string> | undefined,
): { before: MenuRoute; after: MenuRoute } => {
  const items: Array<MenuItem> = [];
  for (const item of SYSTEM_ITEMS) {
    if (item.capability && !hasAreaCapability(capabilities, item.capability)) {
      continue;
    }
    const { capability: _capability, ...menuItem } = item;
    items.push(menuItem);
  }

  return {
    before: [],
    after: [
      { title: 'Sistema', items },
      { title: 'Histórico', items: HISTORY_ITEMS },
      {
        title: 'Conta',
        items: [{ title: 'Perfil', url: '/profile', icon: UserIcon }],
      },
    ],
  };
};
