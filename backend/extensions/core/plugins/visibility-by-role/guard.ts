/* eslint-disable no-unused-vars */
import { left, right } from '@application/core/either.core';
import type { Either } from '@application/core/either.core';
import type {
  IField,
  IRow,
  ITable,
  IUser,
} from '@application/core/entity.core';
import {
  E_FIELD_TYPE,
  E_ROLE,
  E_VISIBILITY,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import type {
  GuardBindResult,
  GuardOperation,
  GuardWriteCheck,
  RowAccessGuard,
} from '@application/core/extensions/row-access-guard.contract';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import type { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import type { TableContractRepository } from '@application/repositories/table/table-contract.repository';

// ── Dependency injection for onTableBound ─────────────────────────────────────

type Deps = {
  fieldRepo: FieldContractRepository;
  tableRepo: TableContractRepository;
  rowRepo: RowContractRepository;
};

let deps: Deps | null = null;

export function injectVisibilityByRoleGuardDeps(d: Deps): void {
  deps = d;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ADMIN_ROLES: string[] = [E_ROLE.MASTER, E_ROLE.ADMINISTRATOR];
const FIELD_SLUG = 'visibility';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAdmin(user: IUser | undefined): boolean {
  return Boolean(user && ADMIN_ROLES.includes(user.role));
}

function isCompatibleDropdown(field: IField): boolean {
  if (field.type !== E_FIELD_TYPE.DROPDOWN) return false;
  const ids = (field.dropdown ?? []).map((o) => o.id);
  return (
    ids.includes(E_VISIBILITY.PUBLIC) && ids.includes(E_VISIBILITY.SIGILOSO)
  );
}

// ── Guard ─────────────────────────────────────────────────────────────────────

export const VisibilityByRoleGuard: RowAccessGuard = {
  pluginKey: 'core:visibility-by-role',
  supportsScopeAll: false,

  async onTableBound(
    table: ITable,
  ): Promise<Either<HTTPException, GuardBindResult>> {
    if (!deps) {
      return left(
        HTTPException.InternalServerError(
          'Dependências do guard não foram injetadas',
          'GUARD_DEPS_NOT_INJECTED',
        ),
      );
    }

    // Step 1: Check if the table already has a field with slug=visibility
    const populatedFields = Array.isArray(table.fields) ? table.fields : [];
    const existingField = populatedFields.find(
      (f): f is IField =>
        typeof f === 'object' &&
        f !== null &&
        (f as IField).slug === FIELD_SLUG,
    );

    let wasCreated = false;

    if (existingField) {
      // Step 2: Field exists — check compatibility
      if (!isCompatibleDropdown(existingField)) {
        return left(
          HTTPException.Conflict(
            'O campo "visibility" já existe nesta tabela mas é incompatível (deve ser DROPDOWN com opções PUBLIC e SIGILOSO)',
            'VISIBILITY_FIELD_INCOMPATIBLE',
          ),
        );
      }
      // Step 3: Compatible — skip create, wasCreated = false
    } else {
      // Step 4: Field does not exist — create it
      const newField = await deps.fieldRepo.create({
        name: 'Visibilidade',
        slug: FIELD_SLUG,
        type: E_FIELD_TYPE.DROPDOWN,
        required: false,
        multiple: false,
        format: null,
        showInFilter: true,
        showInForm: true,
        showInDetail: true,
        showInList: true,
        widthInForm: null,
        widthInList: null,
        widthInDetail: null,
        locked: true,
        native: false,
        defaultValue: E_VISIBILITY.PUBLIC,
        relationship: null,
        dropdown: [
          { id: E_VISIBILITY.PUBLIC, label: 'Público', color: '#22c55e' },
          { id: E_VISIBILITY.SIGILOSO, label: 'Sigiloso', color: '#ef4444' },
        ],
        allowCustomDropdownOptions: false,
        category: [],
        group: null,
      });

      // Associate field to table
      const currentFieldIds = populatedFields.map((f) =>
        typeof f === 'string' ? f : (f as IField)._id,
      );
      await deps.tableRepo.update({
        _id: table._id,
        fields: [...currentFieldIds, newField._id],
      });

      wasCreated = true;
    }

    // Step 5: Backfill — rows without data.visibility get PUBLIC
    await deps.rowRepo.bulkSetMissingField(
      table,
      FIELD_SLUG,
      E_VISIBILITY.PUBLIC,
    );

    return right({ wasCreated });
  },

  adjustListQuery(query, user, _table) {
    if (isAdmin(user)) return query;
    return { ...query, [FIELD_SLUG]: E_VISIBILITY.PUBLIC };
  },

  canRead(row, user, _table) {
    if (isAdmin(user)) return true;
    return (row as Record<string, unknown>)[FIELD_SLUG] === E_VISIBILITY.PUBLIC;
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
    const currentValue = currentRow
      ? (currentRow as Record<string, unknown>)[FIELD_SLUG]
      : undefined;
    return {
      ...payload,
      [FIELD_SLUG]: currentValue ?? E_VISIBILITY.PUBLIC,
    };
  },
};
