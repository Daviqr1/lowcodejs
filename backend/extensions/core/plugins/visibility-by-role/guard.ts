/* eslint-disable no-unused-vars */
import { right } from '@application/core/either.core';
import type { Either } from '@application/core/either.core';
import type { IRow, ITable, IUser } from '@application/core/entity.core';
import { E_ROLE, E_VISIBILITY } from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';
import type {
  GuardBindResult,
  GuardOperation,
  GuardWriteCheck,
  RowAccessGuard,
} from '@application/core/extensions/row-access-guard.contract';

const ADMIN_ROLES: string[] = [E_ROLE.MASTER, E_ROLE.ADMINISTRATOR];
const FIELD_SLUG = 'visibility';

function isAdmin(user: IUser | undefined): boolean {
  return Boolean(user && ADMIN_ROLES.includes(user.role));
}

export const VisibilityByRoleGuard: RowAccessGuard = {
  pluginKey: 'core:visibility-by-role',
  supportsScopeAll: false,

  async onTableBound(_table: ITable): Promise<Either<HTTPException, GuardBindResult>> {
    // implementado na Task 7
    return right({ wasCreated: false });
  },

  adjustListQuery(query, user, _table) {
    if (isAdmin(user)) return query;
    return { ...query, [`data.${FIELD_SLUG}`]: E_VISIBILITY.PUBLIC };
  },

  canRead(row, user, _table) {
    if (isAdmin(user)) return true;
    return row.data?.[FIELD_SLUG] === E_VISIBILITY.PUBLIC;
  },

  canWrite(_row, user, _table, payload, _operation): GuardWriteCheck {
    if (isAdmin(user)) return { allowed: true };
    if (payload?.[FIELD_SLUG] === E_VISIBILITY.SIGILOSO) {
      return { allowed: false, reason: 'Sem permissão para marcar Sigiloso' };
    }
    return { allowed: true };
  },

  sanitizeWritePayload(payload, user, _table, operation, currentRow) {
    if (isAdmin(user)) return payload;
    if (operation === 'create') {
      return { ...payload, [FIELD_SLUG]: E_VISIBILITY.PUBLIC };
    }
    return {
      ...payload,
      [FIELD_SLUG]: currentRow?.data?.[FIELD_SLUG] ?? E_VISIBILITY.PUBLIC,
    };
  },
};
