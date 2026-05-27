import {
  GroupIcon,
  MenuIcon,
  PuzzleIcon,
  SettingsIcon,
  TableIcon,
  UserIcon,
  UsersIcon,
  WrenchIcon,
} from 'lucide-react';

import type { MenuRoute } from './menu-route';

import { E_ROLE } from '@/lib/constant';

export const getStaticMenusByRole = (
  role: string,
): { before: MenuRoute; after: MenuRoute } => {
  switch (role) {
    case E_ROLE.MASTER:
      return {
        before: [],
        after: [
          {
            title: 'Sistema',
            items: [
              { title: 'Tabelas', url: '/tables', icon: TableIcon },
              {
                title: 'Configurações',
                url: '/settings',
                icon: SettingsIcon,
              },
              { title: 'Menus', url: '/menus', icon: MenuIcon },
              { title: 'Grupos', url: '/groups', icon: GroupIcon },
              { title: 'Usuários', url: '/users', icon: UsersIcon },
              { title: 'Ferramentas', url: '/tools', icon: WrenchIcon },
              {
                title: 'Extensões',
                url: '/extensions',
                icon: PuzzleIcon,
              },
            ],
          },
          {
            title: 'Conta',
            items: [{ title: 'Perfil', url: '/profile', icon: UserIcon }],
          },
        ],
      };

    case E_ROLE.ADMINISTRATOR: {
      return {
        before: [],
        after: [
          {
            title: 'Sistema',
            items: [
              { title: 'Tabelas', url: '/tables', icon: TableIcon },
              { title: 'Menus', url: '/menus', icon: MenuIcon },
              { title: 'Usuários', url: '/users', icon: UsersIcon },
            ],
          },
          {
            title: 'Conta',
            items: [{ title: 'Perfil', url: '/profile', icon: UserIcon }],
          },
        ],
      };
    }
    case E_ROLE.MANAGER: {
      return {
        before: [],
        after: [
          {
            title: 'Sistema',
            items: [{ title: 'Tabelas', url: '/tables', icon: TableIcon }],
          },
          {
            title: 'Conta',
            items: [{ title: 'Perfil', url: '/profile', icon: UserIcon }],
          },
        ],
      };
    }
    case E_ROLE.REGISTERED:
      return {
        before: [],
        after: [
          {
            title: 'Sistema',
            items: [{ title: 'Tabelas', url: '/tables', icon: TableIcon }],
          },
          {
            title: 'Conta',
            items: [{ title: 'Perfil', url: '/profile', icon: UserIcon }],
          },
        ],
      };

    default:
      return { before: [], after: [] };
  }
};
