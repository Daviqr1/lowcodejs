/**
 * VisibilityByRoleGuard — v2
 *
 * NOTE: Admin bypass (MASTER / ADMINISTRATOR) é aplicado GLOBALMENTE pelo
 * RowAccessGuardService antes de invocar qualquer guard. Este guard pode assumir
 * que user?.role NUNCA será MASTER ou ADMINISTRATOR.
 */
import { left, right } from '@application/core/either.core';
import type { Either } from '@application/core/either.core';
import type {
  IField,
  IJWTPayload,
  IRow,
  ITable,
} from '@application/core/entity.core';
import { E_FIELD_TYPE, E_VISIBILITY } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import type {
  GuardAccessDecision,
  GuardBindResult,
  GuardWriteDecision,
  RowAccessGuard,
} from '@application/core/extensions/row-access-guard.contract';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import type { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import type { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import type { TableSchemaContractService } from '@application/services/table-schema/table-schema-contract.service';

// ── Dependency injection for onTableBound ─────────────────────────────────────

type Deps = {
  fieldRepo: FieldContractRepository;
  tableRepo: TableContractRepository;
  rowRepo: RowContractRepository;
  tableSchemaService: TableSchemaContractService;
};

let deps: Deps | null = null;

export function injectVisibilityByRoleGuardDeps(d: Deps): void {
  deps = d;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FIELD_SLUG = 'visibility';
const RESTRITO = 'RESTRITO';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * LowCodeJS armazena DROPDOWN fields como array (mesmo com multiple=false).
 * Esses helpers normalizam pra leitura/escrita consistente.
 */
function readVisibility(
  source: Record<string, unknown> | undefined,
): string | undefined {
  if (!source) return undefined;
  const v = source[FIELD_SLUG];
  if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : undefined;
  return v == null ? undefined : String(v);
}

function asVisibilityArray(value: string): [string] {
  return [value];
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
  category: 'restrictive',
  supportsScopeAll: false,
  settingsSchema: undefined,

  async onTableBound(
    table: ITable,
    _settings: Record<string, unknown>,
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
        defaultValue: asVisibilityArray(E_VISIBILITY.PUBLIC),
        relationship: null,
        dropdown: [
          { id: E_VISIBILITY.PUBLIC, label: 'Público', color: '#22c55e' },
          { id: E_VISIBILITY.SIGILOSO, label: 'Sigiloso', color: '#ef4444' },
        ],
        allowCustomDropdownOptions: false,
        category: [],
        group: null,
      });

      // Associate field to table + atualizar _schema + sync mongoose model.
      const populatedFieldObjs = populatedFields.filter(
        (f): f is IField => typeof f === 'object' && f !== null,
      );
      const allFields = [...populatedFieldObjs, newField];
      const currentFieldIds = populatedFields.map((f) =>
        typeof f === 'string' ? f : (f as IField)._id,
      );
      const newSchema = deps.tableSchemaService.computeSchema(
        allFields,
        table.groups,
      );
      const mergedSchema = { ...table._schema, ...newSchema };

      await deps.tableRepo.update({
        _id: table._id,
        fields: [...currentFieldIds, newField._id],
        _schema: mergedSchema,
        fieldOrderList: [...(table.fieldOrderList ?? []), newField._id],
        fieldOrderForm: [...(table.fieldOrderForm ?? []), newField._id],
        fieldOrderFilter: [...(table.fieldOrderFilter ?? []), newField._id],
        fieldOrderDetail: [...(table.fieldOrderDetail ?? []), newField._id],
      });

      // syncModel rebuilda o mongoose model dinamico com o novo field
      await deps.tableSchemaService.syncModel({
        ...table,
        _schema: mergedSchema,
      } as ITable);

      wasCreated = true;
    }

    // Step 5: Backfill — rows without visibility get PUBLIC
    // DROPDOWN field é armazenado como array, mesmo com multiple=false.
    await deps.rowRepo.bulkSetMissingField(
      table,
      FIELD_SLUG,
      asVisibilityArray(E_VISIBILITY.PUBLIC),
    );

    return right({ wasCreated });
  },

  adjustListQuery(
    query: Record<string, unknown>,
    user: IJWTPayload | undefined,
    _table: ITable,
    _settings: Record<string, unknown>,
  ): Record<string, unknown> {
    // Admin bypass is handled globally.
    // MANAGER can see PUBLIC + RESTRITO rows (mirrors canRead logic).
    if (user?.role === 'MANAGER') {
      return {
        ...query,
        [FIELD_SLUG]: { $in: [E_VISIBILITY.PUBLIC, RESTRITO] },
      };
    }
    return { ...query, [FIELD_SLUG]: E_VISIBILITY.PUBLIC };
  },

  canRead(
    row: IRow,
    user: IJWTPayload | undefined,
    _table: ITable,
    _settings: Record<string, unknown>,
  ): GuardAccessDecision {
    // Admin bypass is handled globally — never reaches here for MASTER/ADMINISTRATOR.
    const vis = readVisibility(row as Record<string, unknown>);
    if (vis === E_VISIBILITY.PUBLIC) return 'abstain';
    // RESTRITO is visible to MANAGER role
    if (vis === RESTRITO && user?.role === 'MANAGER') return 'abstain';
    // SIGILOSO or unknown: deny
    return 'deny';
  },

  canWrite(
    _row: IRow | null,
    _user: IJWTPayload | undefined,
    _table: ITable,
    payload: Record<string, unknown> | null,
    _operation: 'create' | 'update' | 'delete',
    _settings: Record<string, unknown>,
  ): GuardWriteDecision {
    // Admin bypass is handled globally.
    if (!payload) return { decision: 'abstain' };
    const incoming = readVisibility(payload);
    if (incoming === E_VISIBILITY.SIGILOSO) {
      return { decision: 'deny', reason: 'ROW_WRITE_RESTRICTED' };
    }
    return { decision: 'abstain' };
  },

  sanitizeWritePayload(
    payload: Record<string, unknown>,
    _user: IJWTPayload | undefined,
    _table: ITable,
    operation: 'create' | 'update',
    currentRow: IRow | null,
    _settings: Record<string, unknown>,
  ): Record<string, unknown> {
    // Admin bypass is handled globally — here we always sanitize for non-admin.
    if (operation === 'create') {
      return {
        ...payload,
        [FIELD_SLUG]: asVisibilityArray(E_VISIBILITY.PUBLIC),
      };
    }
    const currentValue =
      readVisibility(currentRow as Record<string, unknown> | undefined) ??
      E_VISIBILITY.PUBLIC;
    return {
      ...payload,
      [FIELD_SLUG]: asVisibilityArray(currentValue),
    };
  },
};
