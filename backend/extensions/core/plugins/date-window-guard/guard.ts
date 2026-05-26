/**
 * DateWindowGuard — plugin de janela temporal
 *
 * category: 'restrictive' — contribui com AND nas queries, emite 'deny' ou 'abstain'.
 *
 * NOTE: Admin bypass (MASTER / ADMINISTRATOR) é aplicado GLOBALMENTE pelo
 * RowAccessGuardService antes de invocar qualquer guard. Este guard pode assumir
 * que user?.role NUNCA será MASTER ou ADMINISTRATOR.
 *
 * Modos:
 *  - createdAt-sliding : rows criadas nos últimos N dias
 *  - createdAt-fixed   : rows cujo createdAt está no intervalo [fixedFrom, fixedTo]
 *  - field-range       : rows com vigência via campos DATE validFromSlug/validUntilSlug
 *
 * onTableBound:
 *  - createdAt-*  → no-op (campos nativos, sem criação necessária)
 *  - field-range  → cria os dois campos DATE se ausentes, atualiza _schema + fieldOrder*, syncModel
 */
import { left, right } from '@application/core/either.core';
import type { Either } from '@application/core/either.core';
import type {
  IField,
  IJWTPayload,
  IRow,
  ITable,
} from '@application/core/entity.core';
import { E_FIELD_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import type {
  GuardAccessDecision,
  GuardBindResult,
  GuardWriteDecision,
  RowAccessGuard,
} from '@application/core/extensions/row-access-guard.contract';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import type { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import type { TableSchemaContractService } from '@application/services/table-schema/table-schema-contract.service';

import {
  dateWindowSettingsSchema,
  type DateWindowSettings,
} from './settings-schema';

// ── Dependency injection ───────────────────────────────────────────────────────

type DateWindowGuardDeps = {
  fieldRepo: FieldContractRepository;
  tableRepo: TableContractRepository;
  tableSchemaService: TableSchemaContractService;
};

let deps: DateWindowGuardDeps | null = null;

export function injectDateWindowGuardDeps(d: DateWindowGuardDeps): void {
  deps = d;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const DATE_WINDOW_GUARD_PLUGIN_KEY = 'core:date-window-guard';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseSettings(raw: Record<string, unknown>): DateWindowSettings {
  return dateWindowSettingsSchema.parse(raw);
}

/**
 * Settings are configured separately via PATCH /extensions/:id/table-settings/:tableId.
 * Until then settings is `{}` — guard treats it as inactive (no-op) for this table.
 */
function settingsArePresent(raw: Record<string, unknown>): boolean {
  return typeof raw === 'object' && raw !== null && 'mode' in raw;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function isWithinSliding(
  target: Date,
  slidingDays: number,
  now: Date,
): boolean {
  const threshold = now.getTime() - slidingDays * 86400000;
  return target.getTime() >= threshold;
}

function isWithinFixed(
  target: Date,
  fixedFrom: string | null,
  fixedTo: string | null,
): boolean {
  if (fixedFrom && target < new Date(fixedFrom)) return false;
  if (fixedTo && target > new Date(fixedTo)) return false;
  return true;
}

function isWithinFieldRange(
  row: IRow,
  validFromSlug: string,
  validUntilSlug: string,
  now: Date,
): boolean {
  const from = asDate((row as Record<string, unknown>)[validFromSlug]);
  const until = asDate((row as Record<string, unknown>)[validUntilSlug]);
  if (from && now < from) return false;
  if (until && now > until) return false;
  return true;
}

/**
 * Checks if a field with the given slug exists in the table's populated fields
 * and whether it's a DATE field. Returns the field or null.
 */
function findDateFieldInTable(
  populatedFields: IField[],
  slug: string,
): IField | null {
  return (
    populatedFields.find(
      (f) => typeof f === 'object' && f !== null && (f as IField).slug === slug,
    ) ?? null
  );
}

/**
 * Ensures a DATE field with the given slug exists on the table.
 * Creates it if absent. Errors if the slug is taken by a non-DATE field.
 * Returns the field _id and whether it was just created.
 */
async function ensureDateField(
  populatedFields: IField[],
  slug: string,
  label: string,
): Promise<Either<HTTPException, { wasCreated: boolean; field: IField }>> {
  if (!deps) {
    return left(
      HTTPException.InternalServerError(
        'Dependências do DateWindowGuard não foram injetadas',
        'GUARD_DEPS_NOT_INJECTED',
      ),
    );
  }

  const existing = findDateFieldInTable(populatedFields, slug);
  if (existing) {
    if (existing.type !== E_FIELD_TYPE.DATE) {
      return left(
        HTTPException.Conflict(
          `O campo '${slug}' já existe nesta tabela mas não é do tipo DATE.`,
          'ROW_GUARD_FIELD_INCOMPATIBLE',
        ),
      );
    }
    return right({ wasCreated: false, field: existing });
  }

  const created = await deps.fieldRepo.create({
    name: label,
    slug,
    type: E_FIELD_TYPE.DATE,
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
    defaultValue: null,
    relationship: null,
    dropdown: [],
    allowCustomDropdownOptions: false,
    category: [],
    group: null,
  });

  return right({ wasCreated: true, field: created });
}

// ── Guard ─────────────────────────────────────────────────────────────────────

export const DateWindowGuard: RowAccessGuard = {
  pluginKey: DATE_WINDOW_GUARD_PLUGIN_KEY,
  category: 'restrictive',
  supportsScopeAll: true,
  settingsSchema: dateWindowSettingsSchema,

  async onTableBound(
    table: ITable,
    rawSettings: Record<string, unknown>,
  ): Promise<Either<HTTPException, GuardBindResult>> {
    // No settings yet — bind is a no-op. Real configuration arrives via
    // PATCH /extensions/:id/table-settings/:tableId, which re-invokes onTableBound.
    if (!settingsArePresent(rawSettings)) {
      return right({ wasCreated: false });
    }

    const settings = parseSettings(rawSettings);

    // createdAt-* modes need no field creation — createdAt is native
    if (settings.mode !== 'field-range') {
      return right({ wasCreated: false });
    }

    if (!deps) {
      return left(
        HTTPException.InternalServerError(
          'Dependências do DateWindowGuard não foram injetadas',
          'GUARD_DEPS_NOT_INJECTED',
        ),
      );
    }

    const { validFromSlug, validUntilSlug } = settings;

    // Collect already-populated IField objects from table.fields
    const populatedFields = (
      Array.isArray(table.fields) ? table.fields : []
    ).filter((f): f is IField => typeof f === 'object' && f !== null);

    // Ensure valid_from field
    const fromResult = await ensureDateField(
      populatedFields,
      validFromSlug,
      'Válido a partir de',
    );
    if (fromResult.isLeft()) return fromResult;

    // Ensure valid_until field — pass updated list so deduplication works
    const untilResult = await ensureDateField(
      fromResult.value.wasCreated
        ? [...populatedFields, fromResult.value.field]
        : populatedFields,
      validUntilSlug,
      'Válido até',
    );
    if (untilResult.isLeft()) return untilResult;

    const { wasCreated: fromCreated, field: fromField } = fromResult.value;
    const { wasCreated: untilCreated, field: untilField } = untilResult.value;

    const anyCreated = fromCreated || untilCreated;

    if (!anyCreated) {
      // Both fields already existed as DATE — nothing to update
      return right({ wasCreated: false });
    }

    // Build updated field lists
    const currentFieldIds = (
      Array.isArray(table.fields) ? table.fields : []
    ).map((f) => (typeof f === 'string' ? f : (f as IField)._id));

    const newFieldIds = [...currentFieldIds];
    const newFields = [...populatedFields];

    if (fromCreated) {
      newFieldIds.push(fromField._id);
      newFields.push(fromField);
    }
    if (untilCreated) {
      newFieldIds.push(untilField._id);
      newFields.push(untilField);
    }

    // Compute updated _schema
    const newSchema = deps.tableSchemaService.computeSchema(
      newFields,
      table.groups,
    );
    const mergedSchema = { ...table._schema, ...newSchema };

    // Append new field ids to all order lists
    const addedIds: string[] = [];
    if (fromCreated) addedIds.push(fromField._id);
    if (untilCreated) addedIds.push(untilField._id);

    await deps.tableRepo.update({
      _id: table._id,
      fields: newFieldIds,
      _schema: mergedSchema,
      fieldOrderList: [...(table.fieldOrderList ?? []), ...addedIds],
      fieldOrderForm: [...(table.fieldOrderForm ?? []), ...addedIds],
      fieldOrderFilter: [...(table.fieldOrderFilter ?? []), ...addedIds],
      fieldOrderDetail: [...(table.fieldOrderDetail ?? []), ...addedIds],
    });

    // syncModel rebuilds the dynamic mongoose model with the new fields
    await deps.tableSchemaService.syncModel({
      ...table,
      _schema: mergedSchema,
    } as ITable);

    return right({ wasCreated: true });
  },

  adjustListQuery(
    _query: Record<string, unknown>,
    _user: IJWTPayload | undefined,
    _table: ITable,
    rawSettings: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!settingsArePresent(rawSettings)) return {};

    const settings = parseSettings(rawSettings);
    const now = new Date();

    if (settings.mode === 'createdAt-sliding') {
      return {
        createdAt: {
          $gte: new Date(now.getTime() - settings.slidingDays * 86400000),
        },
      };
    }

    if (settings.mode === 'createdAt-fixed') {
      const range: Record<string, Date> = {};
      if (settings.fixedFrom) range.$gte = new Date(settings.fixedFrom);
      if (settings.fixedTo) range.$lte = new Date(settings.fixedTo);
      if (Object.keys(range).length === 0) return {};
      return { createdAt: range };
    }

    // field-range: rows where now is within [validFrom, validUntil]
    return {
      [settings.validFromSlug]: { $lte: now },
      [settings.validUntilSlug]: { $gte: now },
    };
  },

  canRead(
    row: IRow,
    _user: IJWTPayload | undefined,
    _table: ITable,
    rawSettings: Record<string, unknown>,
  ): GuardAccessDecision {
    if (!settingsArePresent(rawSettings)) return 'abstain';

    const settings = parseSettings(rawSettings);
    const now = new Date();

    if (settings.mode === 'createdAt-sliding') {
      const created = asDate((row as Record<string, unknown>).createdAt);
      // If createdAt is missing/unparseable — abstain (cannot evaluate, do not block)
      if (!created) return 'abstain';
      return isWithinSliding(created, settings.slidingDays, now)
        ? 'abstain'
        : 'deny';
    }

    if (settings.mode === 'createdAt-fixed') {
      const created = asDate((row as Record<string, unknown>).createdAt);
      if (!created) return 'abstain';
      return isWithinFixed(created, settings.fixedFrom, settings.fixedTo)
        ? 'abstain'
        : 'deny';
    }

    // field-range
    return isWithinFieldRange(
      row,
      settings.validFromSlug,
      settings.validUntilSlug,
      now,
    )
      ? 'abstain'
      : 'deny';
  },

  canWrite(
    _row: IRow | null,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _payload: Record<string, unknown> | null,
    _operation: 'create' | 'update' | 'delete',
    _settings: Record<string, unknown>,
  ): GuardWriteDecision {
    // Temporal guard does not restrict writes — only visibility
    return { decision: 'abstain' };
  },

  sanitizeWritePayload(
    payload: Record<string, unknown>,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _operation: 'create' | 'update',
    _currentRow: IRow | null,
    _settings: Record<string, unknown>,
  ): Record<string, unknown> {
    // Identity — temporal guard does not mutate payloads
    return payload;
  },
};
