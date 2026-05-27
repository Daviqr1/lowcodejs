/**
 * RowAccessGuard — plugin unico que aplica:
 *   1) Visibility por papel (matriz role x valor configuravel)
 *   2) Bypass do criador (opcional via settings)
 *   3) Janela temporal (off / createdAt-sliding / createdAt-fixed / field-range)
 *
 * NOTE: Admin bypass (MASTER / ADMINISTRATOR) e aplicado GLOBALMENTE pelo
 * RowAccessGuardService antes de invocar qualquer guard. Este guard assume
 * que user?.role NUNCA sera MASTER ou ADMINISTRATOR.
 *
 * Categoria: 'restrictive' — porem o fragmento de query inclui um $or
 * interno para o creator-bypass quando habilitado. O service apenas envolve
 * o fragmento via $and (sem inspecionar conteudo), entao a semantica fica
 * preservada.
 */
import { left, right } from '@application/core/either.core';
import type { Either } from '@application/core/either.core';
import type {
  IDropdown,
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
import type { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import type { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import type { TableSchemaContractService } from '@application/services/table-schema/table-schema-contract.service';

import {
  DEFAULT_ROW_ACCESS_SETTINGS,
  type DateWindowSettings,
  type RowAccessRole,
  type RowAccessSettings,
  rowAccessSettingsSchema,
} from './settings-schema';

// ── Constants ─────────────────────────────────────────────────────────────────

export const ROW_ACCESS_PLUGIN_KEY = 'core:row-access';

// ── Dependency injection ──────────────────────────────────────────────────────

type Deps = {
  fieldRepo: FieldContractRepository;
  tableRepo: TableContractRepository;
  rowRepo: RowContractRepository;
  tableSchemaService: TableSchemaContractService;
};

let deps: Deps | null = null;

export function injectRowAccessGuardDeps(d: Deps): void {
  deps = d;
}

// ── Helpers: settings parsing ─────────────────────────────────────────────────

/**
 * Defensive parse: retorna defaults quando settings vem vazio.
 * `configure-table-scope` chama onTableBound com defaults, mas runtime
 * (adjustListQuery/canRead) recebe o tableSettings persistido que pode estar
 * vazio em transicoes (ex: imediatamente apos bind antes do persist).
 */
function parseSettings(raw: Record<string, unknown>): RowAccessSettings {
  if (!raw || Object.keys(raw).length === 0) {
    return DEFAULT_ROW_ACCESS_SETTINGS;
  }
  return rowAccessSettingsSchema.parse(raw);
}

// ── Helpers: visibility field (DROPDOWN stored as array) ──────────────────────

function readVisibility(
  source: Record<string, unknown> | undefined,
  slug: string,
): string | undefined {
  if (!source) return undefined;
  const v = source[slug];
  if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : undefined;
  return v == null ? undefined : String(v);
}

function asVisibilityArray(value: string): [string] {
  return [value];
}

function isCompatibleVisibilityDropdown(
  field: IField,
  values: readonly string[],
): boolean {
  if (field.type !== E_FIELD_TYPE.DROPDOWN) return false;
  const ids = (field.dropdown ?? []).map((o) => o.id);
  return values.every((v) => ids.includes(v));
}

function buildDropdownOptions(values: readonly string[]): IDropdown[] {
  // Cores fixas por valor conhecido; valores customizados ganham cinza
  const colorMap: Record<string, string> = {
    PUBLIC: '#22c55e',
    INTERNO: '#3b82f6',
    RESTRITO: '#f59e0b',
    SIGILOSO: '#ef4444',
  };
  return values.map((id) => ({
    id,
    label: id.charAt(0) + id.slice(1).toLowerCase(),
    color: colorMap[id] ?? '#6b7280',
  }));
}

// ── Helpers: creator-bypass ───────────────────────────────────────────────────

function rowCreatorMatchesUser(
  row: { creator?: unknown } | null | undefined,
  user: IJWTPayload | undefined,
): boolean {
  if (!row || typeof row.creator !== 'string' || !row.creator) return false;
  if (!user?.sub) return false;
  return row.creator === user.sub;
}

// ── Helpers: date-window ──────────────────────────────────────────────────────

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function buildDateWindowQuery(
  settings: DateWindowSettings,
  now: Date,
): Record<string, unknown> {
  if (settings.mode === 'off') return {};

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

  // field-range
  return {
    [settings.validFromSlug]: { $lte: now },
    [settings.validUntilSlug]: { $gte: now },
  };
}

function rowPassesDateWindow(
  row: IRow,
  settings: DateWindowSettings,
  now: Date,
): boolean {
  if (settings.mode === 'off') return true;

  if (settings.mode === 'createdAt-sliding') {
    const created = asDate((row as Record<string, unknown>).createdAt);
    if (!created) return true; // sem createdAt: nao bloqueia
    const threshold = now.getTime() - settings.slidingDays * 86400000;
    return created.getTime() >= threshold;
  }

  if (settings.mode === 'createdAt-fixed') {
    const created = asDate((row as Record<string, unknown>).createdAt);
    if (!created) return true;
    if (settings.fixedFrom && created < new Date(settings.fixedFrom))
      return false;
    if (settings.fixedTo && created > new Date(settings.fixedTo)) return false;
    return true;
  }

  // field-range
  const from = asDate((row as Record<string, unknown>)[settings.validFromSlug]);
  const until = asDate(
    (row as Record<string, unknown>)[settings.validUntilSlug],
  );
  if (from && now < from) return false;
  if (until && now > until) return false;
  return true;
}

// ── Helpers: visibility-by-role (canRead/sanitize) ────────────────────────────

function rolesForValue(
  settings: RowAccessSettings,
  value: string | undefined,
): RowAccessRole[] {
  if (!value) return [];
  return settings.visibility.roleMatrix[value] ?? [];
}

function rolesIncluding(role: RowAccessRole | undefined): boolean {
  return role === 'MANAGER' || role === 'REGISTERED';
}

function visibleValuesForRole(
  settings: RowAccessSettings,
  role: RowAccessRole,
): string[] {
  return settings.visibility.values.filter((value) =>
    (settings.visibility.roleMatrix[value] ?? []).includes(role),
  );
}

// ── onTableBound: garante fields dinamicos ────────────────────────────────────

function findFieldBySlug(
  populatedFields: IField[],
  slug: string,
): IField | null {
  return (
    populatedFields.find(
      (f) => typeof f === 'object' && f !== null && (f as IField).slug === slug,
    ) ?? null
  );
}

async function ensureDateField(
  populatedFields: IField[],
  slug: string,
  label: string,
): Promise<Either<HTTPException, { wasCreated: boolean; field: IField }>> {
  if (!deps) {
    return left(
      HTTPException.InternalServerError(
        'Dependencias do RowAccessGuard nao foram injetadas',
        'GUARD_DEPS_NOT_INJECTED',
      ),
    );
  }

  const existing = findFieldBySlug(populatedFields, slug);
  if (existing) {
    if (existing.type !== E_FIELD_TYPE.DATE) {
      return left(
        HTTPException.Conflict(
          `O campo '${slug}' ja existe nesta tabela mas nao e do tipo DATE.`,
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

async function ensureVisibilityField(
  populatedFields: IField[],
  settings: RowAccessSettings,
): Promise<Either<HTTPException, { wasCreated: boolean; field: IField }>> {
  if (!deps) {
    return left(
      HTTPException.InternalServerError(
        'Dependencias do RowAccessGuard nao foram injetadas',
        'GUARD_DEPS_NOT_INJECTED',
      ),
    );
  }

  const slug = settings.visibility.fieldSlug;
  const existing = findFieldBySlug(populatedFields, slug);

  if (existing) {
    if (existing.type !== E_FIELD_TYPE.DROPDOWN) {
      return left(
        HTTPException.Conflict(
          `O campo '${slug}' ja existe mas nao e DROPDOWN.`,
          'VISIBILITY_FIELD_INCOMPATIBLE',
        ),
      );
    }
    // Atualiza dropdown options pra refletir settings.values:
    // - mantem labels/cores customizadas das opcoes existentes
    // - adiciona novos valores com labels/cores default
    // - remove opcoes nao mais em settings.values (rows com valor orfao
    //   continuam funcionando, mas valor nao aparece mais como opcao no form)
    const existingByIds = new Map(
      (existing.dropdown ?? []).map((o) => [o.id, o]),
    );
    const defaultOpts = buildDropdownOptions(settings.visibility.values);
    const nextDropdown = defaultOpts.map(
      (opt) => existingByIds.get(opt.id) ?? opt,
    );

    const needsUpdate =
      (existing.dropdown ?? []).length !== nextDropdown.length ||
      !(existing.dropdown ?? []).every((o, i) => o.id === nextDropdown[i]?.id);

    if (needsUpdate) {
      const updated = await deps.fieldRepo.update({
        _id: existing._id,
        dropdown: nextDropdown,
      });
      return right({ wasCreated: false, field: updated });
    }
    return right({ wasCreated: false, field: existing });
  }

  const created = await deps.fieldRepo.create({
    name: 'Visibilidade',
    slug,
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
    defaultValue: asVisibilityArray(settings.visibility.defaultValue),
    relationship: null,
    dropdown: buildDropdownOptions(settings.visibility.values),
    allowCustomDropdownOptions: false,
    category: [],
    group: null,
  });

  return right({ wasCreated: true, field: created });
}

// ── Guard ─────────────────────────────────────────────────────────────────────

export const RowAccessControlGuard: RowAccessGuard = {
  pluginKey: ROW_ACCESS_PLUGIN_KEY,
  category: 'restrictive',
  supportsScopeAll: false,
  settingsSchema: rowAccessSettingsSchema,
  defaultSettings: DEFAULT_ROW_ACCESS_SETTINGS,

  async onTableBound(
    table: ITable,
    rawSettings: Record<string, unknown>,
  ): Promise<Either<HTTPException, GuardBindResult>> {
    if (!deps) {
      return left(
        HTTPException.InternalServerError(
          'Dependencias do RowAccessGuard nao foram injetadas',
          'GUARD_DEPS_NOT_INJECTED',
        ),
      );
    }

    const settings = parseSettings(rawSettings);

    const populatedFields = (
      Array.isArray(table.fields) ? table.fields : []
    ).filter((f): f is IField => typeof f === 'object' && f !== null);

    const createdFields: IField[] = [];

    // 1. Garante visibility field
    if (settings.visibility.enabled) {
      const result = await ensureVisibilityField(populatedFields, settings);
      if (result.isLeft()) return result;
      if (result.value.wasCreated) createdFields.push(result.value.field);
    }

    // 2. Garante fields de date-window (modo field-range)
    if (settings.dateWindow.mode === 'field-range') {
      const fieldsSoFar = [...populatedFields, ...createdFields];
      const fromResult = await ensureDateField(
        fieldsSoFar,
        settings.dateWindow.validFromSlug,
        'Valido a partir de',
      );
      if (fromResult.isLeft()) return fromResult;
      if (fromResult.value.wasCreated)
        createdFields.push(fromResult.value.field);

      const untilResult = await ensureDateField(
        [...fieldsSoFar, ...createdFields],
        settings.dateWindow.validUntilSlug,
        'Valido ate',
      );
      if (untilResult.isLeft()) return untilResult;
      if (untilResult.value.wasCreated)
        createdFields.push(untilResult.value.field);
    }

    // 3. Atualiza schema da tabela se algo foi criado
    if (createdFields.length > 0) {
      const currentFieldIds = (
        Array.isArray(table.fields) ? table.fields : []
      ).map((f) => (typeof f === 'string' ? f : (f as IField)._id));
      const allFields = [...populatedFields, ...createdFields];
      const addedIds = createdFields.map((f) => f._id);

      const newSchema = deps.tableSchemaService.computeSchema(
        allFields,
        table.groups,
      );
      const mergedSchema = { ...table._schema, ...newSchema };

      await deps.tableRepo.update({
        _id: table._id,
        fields: [...currentFieldIds, ...addedIds],
        _schema: mergedSchema,
        fieldOrderList: [...(table.fieldOrderList ?? []), ...addedIds],
        fieldOrderForm: [...(table.fieldOrderForm ?? []), ...addedIds],
        fieldOrderFilter: [...(table.fieldOrderFilter ?? []), ...addedIds],
        fieldOrderDetail: [...(table.fieldOrderDetail ?? []), ...addedIds],
      });

      await deps.tableSchemaService.syncModel({
        ...table,
        _schema: mergedSchema,
      } as ITable);
    }

    // 4. Backfill visibility (apenas se habilitado)
    if (settings.visibility.enabled) {
      await deps.rowRepo.bulkSetMissingField(
        table,
        settings.visibility.fieldSlug,
        asVisibilityArray(settings.visibility.defaultValue),
      );
    }

    return right({ wasCreated: createdFields.length > 0 });
  },

  /**
   * Monta fragmento de query Mongo.
   *
   * - Sem user: retorna {} (admin bypass cuida do MASTER; o resto fica com
   *   table-access middleware).
   * - Com user: combina restritivos (visibility + dateWindow) via AND.
   *   Se creator-bypass habilitado: envolve o tudo em
   *   { $or: [restritivo, { creator: user.sub }] }.
   */
  adjustListQuery(
    _query: Record<string, unknown>,
    user: IJWTPayload | undefined,
    _table: ITable,
    rawSettings: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!user?.sub) return {};
    const settings = parseSettings(rawSettings);
    const role = user.role as RowAccessRole;

    const restrictiveParts: Record<string, unknown>[] = [];

    // visibility
    if (settings.visibility.enabled) {
      const allowed = visibleValuesForRole(settings, role);
      if (allowed.length === 0) {
        // Role nao ve NENHUM valor — bloqueia tudo (sem creator escape)
        restrictiveParts.push({
          [settings.visibility.fieldSlug]: { $in: ['__BLOCKED__'] },
        });
      } else {
        restrictiveParts.push({
          [settings.visibility.fieldSlug]: { $in: allowed },
        });
      }
    }

    // dateWindow
    const dateFrag = buildDateWindowQuery(settings.dateWindow, new Date());
    if (Object.keys(dateFrag).length > 0) restrictiveParts.push(dateFrag);

    const restrictive: Record<string, unknown> =
      restrictiveParts.length === 0
        ? {}
        : restrictiveParts.length === 1
          ? restrictiveParts[0]!
          : { $and: restrictiveParts };

    // creator-bypass
    if (!settings.creatorBypass.enabled) return restrictive;

    const permissive = { creator: user.sub };

    if (Object.keys(restrictive).length === 0) {
      // sem restricoes — creator-bypass nao adiciona nada util
      return {};
    }

    return { $or: [restrictive, permissive] };
  },

  /**
   * Tri-state:
   *  - creator-bypass match → 'allow' (vence visibility/dateWindow)
   *  - visibility bloqueia → 'deny'
   *  - dateWindow bloqueia → 'deny'
   *  - tudo OK → 'abstain'
   */
  canRead(
    row: IRow,
    user: IJWTPayload | undefined,
    _table: ITable,
    rawSettings: Record<string, unknown>,
  ): GuardAccessDecision {
    const settings = parseSettings(rawSettings);

    // 1. Creator bypass (allow vence tudo)
    if (
      settings.creatorBypass.enabled &&
      rowCreatorMatchesUser(row as { creator?: unknown }, user)
    ) {
      return 'allow';
    }

    const role = user?.role as RowAccessRole | undefined;

    // 2. Visibility por papel
    if (settings.visibility.enabled) {
      if (!role) return 'deny';
      const vis = readVisibility(
        row as Record<string, unknown>,
        settings.visibility.fieldSlug,
      );
      const allowedRoles = rolesForValue(settings, vis);
      if (!allowedRoles.includes(role)) return 'deny';
    }

    // 3. Date-window
    if (!rowPassesDateWindow(row, settings.dateWindow, new Date())) {
      return 'deny';
    }

    return 'abstain';
  },

  /**
   * Write decisions:
   *  - creator bypass aprova update/delete da propria row
   *  - tentar setar visibility para valor que role nao pode ver → deny
   *  - resto → abstain
   */
  canWrite(
    currentRow: IRow | null,
    user: IJWTPayload | undefined,
    _table: ITable,
    payload: Record<string, unknown> | null,
    operation: 'create' | 'update' | 'delete',
    rawSettings: Record<string, unknown>,
  ): GuardWriteDecision {
    const settings = parseSettings(rawSettings);
    const role = user?.role as RowAccessRole | undefined;

    // 1. Creator bypass (update/delete)
    if (
      settings.creatorBypass.enabled &&
      operation !== 'create' &&
      rowCreatorMatchesUser(currentRow as { creator?: unknown } | null, user)
    ) {
      return { decision: 'allow' };
    }

    // 2. Visibility: bloquear payload com valor nao permitido pro role
    if (settings.visibility.enabled && payload && role) {
      const incoming = readVisibility(payload, settings.visibility.fieldSlug);
      if (incoming) {
        const allowedRoles = rolesForValue(settings, incoming);
        if (!allowedRoles.includes(role)) {
          return { decision: 'deny', reason: 'ROW_WRITE_RESTRICTED' };
        }
      }
    }

    return { decision: 'abstain' };
  },

  /**
   * Sanitize visibility no payload:
   *  - create: se role nao escolheu valor permitido, atribui defaultValue
   *  - update: preserva valor atual da row se payload tentar valor proibido
   *
   * Date-window e creator-bypass nao sanitizam payloads.
   */
  sanitizeWritePayload(
    payload: Record<string, unknown>,
    user: IJWTPayload | undefined,
    _table: ITable,
    operation: 'create' | 'update',
    currentRow: IRow | null,
    rawSettings: Record<string, unknown>,
  ): Record<string, unknown> {
    const settings = parseSettings(rawSettings);
    if (!settings.visibility.enabled) return payload;

    const role = user?.role as RowAccessRole | undefined;
    if (!role || !rolesIncluding(role)) return payload;

    const slug = settings.visibility.fieldSlug;
    const incoming = readVisibility(payload, slug);
    const allowedRoles = incoming ? rolesForValue(settings, incoming) : [];
    const incomingAllowed = incoming && allowedRoles.includes(role);

    if (operation === 'create') {
      if (incomingAllowed) {
        // Normaliza pra array (DROPDOWN field e armazenado como array)
        return { ...payload, [slug]: asVisibilityArray(incoming) };
      }
      // forca defaultValue (se role nao pode ver default, usa o primeiro valor que pode)
      const fallback = visibleValuesForRole(settings, role)[0];
      const finalValue =
        fallback &&
        rolesForValue(settings, settings.visibility.defaultValue).includes(role)
          ? settings.visibility.defaultValue
          : (fallback ?? settings.visibility.defaultValue);
      return { ...payload, [slug]: asVisibilityArray(finalValue) };
    }

    // update: preserva valor atual se incoming proibido; normaliza pra array
    if (incomingAllowed) {
      return { ...payload, [slug]: asVisibilityArray(incoming) };
    }
    const currentValue =
      readVisibility(currentRow as Record<string, unknown> | undefined, slug) ??
      settings.visibility.defaultValue;
    return { ...payload, [slug]: asVisibilityArray(currentValue) };
  },
};
