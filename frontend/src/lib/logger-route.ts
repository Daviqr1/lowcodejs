import { E_LOGGER_OBJECT_TYPE } from '@/lib/constant';
import type { ILogger } from '@/lib/interfaces';

export type LoggerNavigateTarget = {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
};

function matchTableRow(url: string): RegExpMatchArray | null {
  return url.match(/\/tables\/([^/?]+)\/rows\/([^/?]+)/);
}

function matchTableField(url: string): RegExpMatchArray | null {
  return url.match(/\/tables\/([^/?]+)\/fields\/([^/?]+)/);
}

function matchTableGroupField(url: string): RegExpMatchArray | null {
  return url.match(/\/tables\/([^/?]+)\/groups\/([^/?]+)\/fields/);
}

function matchTableSlug(url: string): RegExpMatchArray | null {
  return url.match(/\/tables\/([^/?]+)/);
}

export function resolveLoggerNavigateTarget(
  entry: ILogger,
): LoggerNavigateTarget | null {
  const url = entry.url.split('?')[0] ?? '';
  const id = entry.object_id ?? null;

  switch (entry.object) {
    case E_LOGGER_OBJECT_TYPE.PROFILE:
      return { to: '/profile' };

    case E_LOGGER_OBJECT_TYPE.SETTING:
      return { to: '/settings' };

    case E_LOGGER_OBJECT_TYPE.EXTENSION:
      return { to: '/extensions' };

    case E_LOGGER_OBJECT_TYPE.USER:
      if (id) return { to: '/users/$userId', params: { userId: id } };
      return { to: '/users' };

    case E_LOGGER_OBJECT_TYPE.USER_GROUP:
      if (id) return { to: '/groups/$groupId', params: { groupId: id } };
      return { to: '/groups' };

    case E_LOGGER_OBJECT_TYPE.MENU:
      if (id) return { to: '/menus/$menuId', params: { menuId: id } };
      return { to: '/menus' };

    case E_LOGGER_OBJECT_TYPE.PAGE:
      if (id) return { to: '/pages/$slug', params: { slug: id } };
      return null;

    case E_LOGGER_OBJECT_TYPE.TABLE:
      if (id) return { to: '/tables/$slug', params: { slug: id } };
      return { to: '/tables' };

    case E_LOGGER_OBJECT_TYPE.ROW: {
      const rowMatch = matchTableRow(url);
      if (rowMatch) {
        return {
          to: '/tables/$slug/row',
          params: { slug: rowMatch[1] },
          search: { _id: rowMatch[2] },
        };
      }
      const tableMatch = matchTableSlug(url);
      if (tableMatch) {
        return { to: '/tables/$slug', params: { slug: tableMatch[1] } };
      }
      return null;
    }

    case E_LOGGER_OBJECT_TYPE.FIELD: {
      const groupFieldMatch = matchTableGroupField(url);
      if (groupFieldMatch) {
        return { to: '/tables/$slug', params: { slug: groupFieldMatch[1] } };
      }
      const fieldMatch = matchTableField(url);
      if (fieldMatch) {
        return {
          to: '/tables/$slug/field/$fieldId',
          params: { slug: fieldMatch[1], fieldId: fieldMatch[2] },
        };
      }
      const tableMatch = matchTableSlug(url);
      if (tableMatch) {
        return {
          to: '/tables/$slug/field/management',
          params: { slug: tableMatch[1] },
        };
      }
      return null;
    }

    case E_LOGGER_OBJECT_TYPE.GROUP_FIELD: {
      const groupFieldMatch = matchTableGroupField(url);
      if (groupFieldMatch) {
        return { to: '/tables/$slug', params: { slug: groupFieldMatch[1] } };
      }
      const tableMatch = matchTableSlug(url);
      if (tableMatch) {
        return { to: '/tables/$slug', params: { slug: tableMatch[1] } };
      }
      return null;
    }

    case E_LOGGER_OBJECT_TYPE.GROUP_ROW: {
      const rowMatch = matchTableRow(url);
      if (rowMatch) {
        return {
          to: '/tables/$slug/row',
          params: { slug: rowMatch[1] },
          search: { _id: rowMatch[2] },
        };
      }
      const tableMatch = matchTableSlug(url);
      if (tableMatch) {
        return { to: '/tables/$slug', params: { slug: tableMatch[1] } };
      }
      return null;
    }

    case E_LOGGER_OBJECT_TYPE.PERMISSION:
    case E_LOGGER_OBJECT_TYPE.SETUP:
    case E_LOGGER_OBJECT_TYPE.STORAGE:
      return null;

    default:
      return null;
  }
}
