/**
 * RowAccessGuard — plugin único que aplica:
 *   1) Visibility por grupo (matriz groupMatrix: valor -> ids de grupo)
 *   2) Bypass do criador (opcional via settings)
 *   3) Janela temporal (off / createdAt-sliding / createdAt-fixed / field-range)
 *
 * NOTE: Bypass de privilegiado (MASTER / ADMINISTRATOR) é aplicado GLOBALMENTE
 * pelo RowAccessGuardService antes de invocar qualquer guard. Este guard assume
 * que `ctx.isPrivileged` NUNCA será true aqui.
 *
 * Categoria: 'restrictive' — porém o fragmento de query inclui um $or
 * interno para o creator-bypass quando habilitado. O service apenas envolve
 * o fragmento via $and (sem inspecionar conteúdo), então a semântica fica
 * preservada.
 *
 * Dependências (fieldRepo/tableRepo/rowRepo/builders) chegam por constructor
 * injection (@Service + di-registry) — sem setter global nem wiring manual.
 */
import { Service } from 'fastify-decorators';

import { left, right } from '@application/core/either.core';
import type { Either } from '@application/core/either.core';
import type {
  IDropdown,
  IField,
  IRow,
  ITable,
  ITableSchema,
} from '@application/core/entity.core';
import { E_FIELD_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import type {
  GuardAccessDecision,
  GuardBindResult,
  GuardCategory,
  GuardEvalContext,
  GuardWriteDecision,
  RowAccessGuard,
} from '@application/core/extensions/row-access-guard.contract';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { ModelBuilderContractService } from '@application/services/table/model-builder-contract.service';
import { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';

import {
  DEFAULT_ROW_ACCESS_SETTINGS,
  type DateWindowSettings,
  type RowAccessSettings,
  rowAccessSettingsSchema,
} from './settings-schema';

// ── Constants ─────────────────────────────────────────────────────────────────

export const ROW_ACCESS_PLUGIN_KEY = 'core:row-access';

// ── Helpers: settings parsing ─────────────────────────────────────────────────

/**
 * Defensive parse: retorna defaults quando settings vem vazio.
 * Runtime (adjustListQuery/canRead) pode receber tableSettings vazio em
 * transições (ex: imediatamente após bind antes do persist).
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
  if (Array.isArray(v)) {
    if (v.length > 0) return String(v[0]);
    return undefined;
  }
  if (v == null) return undefined;
  return String(v);
}

function asVisibilityArray(value: string): [string] {
  return [value];
}

function buildDropdownOptions(values: readonly string[]): IDropdown[] {
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
  row: IRow | null | undefined,
  ctx: GuardEvalContext,
): boolean {
  if (!row) return false;
  const creator = row.creator;
  if (typeof creator !== 'string' || !creator) return false;
  if (!ctx.userId) return false;
  return creator === ctx.userId;
}

// ── Helpers: date-window ──────────────────────────────────────────────────────

function asDate(value: unknown): Date | null {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
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
    const created = asDate(row.createdAt);
    if (!created) return true; // sem createdAt: não bloqueia
    const threshold = now.getTime() - settings.slidingDays * 86400000;
    return created.getTime() >= threshold;
  }

  if (settings.mode === 'createdAt-fixed') {
    const created = asDate(row.createdAt);
    if (!created) return true;
    if (settings.fixedFrom && created < new Date(settings.fixedFrom))
      return false;
    if (settings.fixedTo && created > new Date(settings.fixedTo)) return false;
    return true;
  }

  // field-range
  const from = asDate(row[settings.validFromSlug]);
  const until = asDate(row[settings.validUntilSlug]);
  if (from && now < from) return false;
  if (until && now > until) return false;
  return true;
}

// ── Helpers: visibility-by-group ──────────────────────────────────────────────

/**
 * IDs de grupo que podem ver rows com esse valor de visibilidade.
 * Vazio = nenhum grupo vê (exceto criador via creator-bypass e privilegiados).
 */
function groupIdsForValue(
  settings: RowAccessSettings,
  value: string | undefined,
): string[] {
  if (!value) return [];
  return settings.visibility.groupMatrix[value] ?? [];
}

/**
 * Verifica se algum grupo do contexto do usuário tem acesso ao valor.
 */
function ctxCanSeeValue(
  settings: RowAccessSettings,
  value: string | undefined,
  ctx: GuardEvalContext,
): boolean {
  const allowedGroupIds = groupIdsForValue(settings, value);
  if (allowedGroupIds.length === 0) return false;
  return allowedGroupIds.some((gid) => ctx.groupIds.has(gid));
}

/**
 * Valores que o contexto do usuário pode ver (para construir $in na query).
 */
function visibleValuesForCtx(
  settings: RowAccessSettings,
  ctx: GuardEvalContext,
): string[] {
  return settings.visibility.values.filter((value) =>
    ctxCanSeeValue(settings, value, ctx),
  );
}

function findFieldBySlug(
  populatedFields: IField[],
  slug: string,
): IField | null {
  return populatedFields.find((f) => f.slug === slug) ?? null;
}

// ── Helpers: visibility por campo USER_GROUP ──────────────────────────────────

/**
 * IDs de grupo gravados num campo USER_GROUP da row. O valor pode chegar como
 * array de ids crus (antes do populate) ou de docs populados (`{ _id }`).
 */
function isRecordWithId(value: unknown): value is { _id: unknown } {
  return typeof value === 'object' && value !== null && '_id' in value;
}

function readGroupIds(
  source: Record<string, unknown> | undefined,
  slug: string,
): string[] {
  if (!source) return [];
  const value = source[slug];
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const item of value) {
    if (isRecordWithId(item)) {
      ids.push(String(item._id));
      continue;
    }
    if (item != null) ids.push(String(item));
  }
  return ids.filter((id) => id.length > 0);
}

/**
 * True se algum grupo do contexto do usuário está entre os grupos do campo.
 */
function ctxIntersectsRowGroups(
  rowGroupIds: string[],
  ctx: GuardEvalContext,
): boolean {
  return rowGroupIds.some((gid) => ctx.groupIds.has(gid));
}

// ── Guard ─────────────────────────────────────────────────────────────────────

@Service()
export class RowAccessControlGuard implements RowAccessGuard {
  readonly pluginKey = ROW_ACCESS_PLUGIN_KEY;
  readonly category: GuardCategory = 'restrictive';
  readonly supportsScopeAll = false;
  readonly settingsSchema = rowAccessSettingsSchema;
  readonly defaultSettings: Record<string, unknown> = {
    ...DEFAULT_ROW_ACCESS_SETTINGS,
  };

  constructor(
    private readonly fieldRepo: FieldContractRepository,
    private readonly tableRepo: TableContractRepository,
    private readonly rowRepo: RowContractRepository,
    private readonly schemaBuilder: SchemaBuilderContractService,
    private readonly modelBuilder: ModelBuilderContractService,
  ) {}

  // ── onTableBound helpers ──────────────────────────────────────────────────

  private async ensureDateField(
    populatedFields: IField[],
    slug: string,
    label: string,
  ): Promise<Either<HTTPException, { wasCreated: boolean; field: IField }>> {
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

    const created = await this.fieldRepo.create({
      name: label,
      slug,
      type: E_FIELD_TYPE.DATE,
      required: false,
      multiple: false,
      format: null,
      showInFilter: true,
      permissions: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
      tip: null,
      locked: true,
      native: false,
      defaultValue: null,
      relationship: null,
      dropdown: [],
      allowCustomDropdownOptions: false,
      allowCreateRelationshipRecords: false,
      category: [],
      group: null,
    });

    return right({ wasCreated: true, field: created });
  }

  private async ensureVisibilityField(
    populatedFields: IField[],
    settings: RowAccessSettings,
  ): Promise<Either<HTTPException, { wasCreated: boolean; field: IField }>> {
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
      // Atualiza dropdown options para refletir settings.values
      const existingByIds = new Map(
        (existing.dropdown ?? []).map((o) => [o.id, o]),
      );
      const defaultOpts = buildDropdownOptions(settings.visibility.values);
      const nextDropdown = defaultOpts.map(
        (opt) => existingByIds.get(opt.id) ?? opt,
      );

      const needsUpdate =
        (existing.dropdown ?? []).length !== nextDropdown.length ||
        !(existing.dropdown ?? []).every(
          (o, i) => o.id === nextDropdown[i]?.id,
        );

      if (needsUpdate) {
        const updated = await this.fieldRepo.update({
          _id: existing._id,
          dropdown: nextDropdown,
        });
        return right({ wasCreated: false, field: updated });
      }
      return right({ wasCreated: false, field: existing });
    }

    const created = await this.fieldRepo.create({
      name: 'Visibilidade',
      slug,
      type: E_FIELD_TYPE.DROPDOWN,
      required: false,
      multiple: false,
      format: null,
      showInFilter: true,
      permissions: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
      tip: null,
      locked: true,
      native: false,
      defaultValue: asVisibilityArray(settings.visibility.defaultValue),
      relationship: null,
      dropdown: buildDropdownOptions(settings.visibility.values),
      allowCustomDropdownOptions: false,
      allowCreateRelationshipRecords: false,
      category: [],
      group: null,
    });

    return right({ wasCreated: true, field: created });
  }

  async onTableBound(
    table: ITable,
    rawSettings: Record<string, unknown>,
  ): Promise<Either<HTTPException, GuardBindResult>> {
    const settings = parseSettings(rawSettings);

    const populatedFields = table.fields.filter(
      (f): f is IField => typeof f === 'object' && f !== null,
    );

    const createdFields: IField[] = [];

    // 0. Valida o campo USER_GROUP referenciado por fieldVisibility (não cria
    //    campo — o usuário cria via "Criar Campo"; aqui só checamos o vínculo).
    if (settings.fieldVisibility.enabled) {
      const slug = settings.fieldVisibility.fieldSlug;
      const field = findFieldBySlug(populatedFields, slug);
      if (!field) {
        return left(
          HTTPException.Conflict(
            `O campo '${slug}' nao existe nesta tabela.`,
            'ROW_GUARD_FIELD_VISIBILITY_MISSING',
          ),
        );
      }
      if (field.type !== E_FIELD_TYPE.USER_GROUP) {
        return left(
          HTTPException.Conflict(
            `O campo '${slug}' precisa ser do tipo Grupos de usuarios.`,
            'ROW_GUARD_FIELD_VISIBILITY_INCOMPATIBLE',
          ),
        );
      }
    }

    // 1. Garante visibility field
    if (settings.visibility.enabled) {
      const result = await this.ensureVisibilityField(
        populatedFields,
        settings,
      );
      if (result.isLeft()) return result;
      if (result.value.wasCreated) createdFields.push(result.value.field);
    }

    // 2. Garante fields de date-window (modo field-range)
    if (settings.dateWindow.mode === 'field-range') {
      const fieldsSoFar = [...populatedFields, ...createdFields];
      const fromResult = await this.ensureDateField(
        fieldsSoFar,
        settings.dateWindow.validFromSlug,
        'Valido a partir de',
      );
      if (fromResult.isLeft()) return fromResult;
      if (fromResult.value.wasCreated)
        createdFields.push(fromResult.value.field);

      const untilResult = await this.ensureDateField(
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
      const currentFieldIds = table.fields.map((f) => f._id);
      const allFields = [...populatedFields, ...createdFields];
      const addedIds = createdFields.map((f) => f._id);

      const newSchema = this.schemaBuilder.build(allFields, table.groups);
      const mergedSchema: ITableSchema = { ...table._schema, ...newSchema };

      await this.tableRepo.update({
        _id: table._id,
        fields: [...currentFieldIds, ...addedIds],
        _schema: mergedSchema,
        fieldOrderList: [...(table.fieldOrderList ?? []), ...addedIds],
        fieldOrderForm: [...(table.fieldOrderForm ?? []), ...addedIds],
        fieldOrderFilter: [...(table.fieldOrderFilter ?? []), ...addedIds],
        fieldOrderDetail: [...(table.fieldOrderDetail ?? []), ...addedIds],
      });

      await this.modelBuilder.build({ ...table, _schema: mergedSchema });
    }

    // 4. Backfill visibility (apenas se habilitado e há rowRepo)
    // Usa updateMany para backfill REAL de TODAS as rows sem o campo.
    // Idempotente: rows que já têm o campo não são afetadas.
    if (settings.visibility.enabled) {
      const slug = settings.visibility.fieldSlug;
      const defaultVal = asVisibilityArray(settings.visibility.defaultValue);
      await this.rowRepo.updateMany({
        table,
        filter: { [slug]: { $exists: false } },
        update: { $set: { [slug]: defaultVal } },
      });
    }

    return right({ wasCreated: createdFields.length > 0 });
  }

  /**
   * Monta fragmento de query Mongo.
   *
   * - Sem userId: retorna {} (visitante — bloqueado pelo table-access middleware).
   * - Com ctx: combina restritivos (visibility + dateWindow) via AND.
   *   Se creator-bypass habilitado: envolve tudo em
   *   { $or: [restritivo, { creator: ctx.userId }] }.
   */
  adjustListQuery(
    _query: Record<string, unknown>,
    ctx: GuardEvalContext,
    _table: ITable,
    rawSettings: Record<string, unknown>,
  ): Record<string, unknown> {
    const settings = parseSettings(rawSettings);

    // FIX: visitante sem userId deve ser bloqueado quando visibility esta habilitada.
    // Retornar {} seria "sem restrição", o que vazaria todas as rows para visitantes.
    // canRead já nega visitantes — aqui garantimos consistência na listagem.
    if (!ctx.userId) {
      // Fragmento impossível de satisfazer: bloqueia a listagem inteiramente
      // quando qualquer modo restritivo por grupo está habilitado.
      if (settings.visibility.enabled) {
        return { [settings.visibility.fieldSlug]: { $in: ['__BLOCKED__'] } };
      }
      if (settings.fieldVisibility.enabled) {
        return {
          [settings.fieldVisibility.fieldSlug]: { $in: ['__BLOCKED__'] },
        };
      }
      // Sem visibility habilitada, visitante não tem restrição adicional do guard.
      return {};
    }

    const restrictiveParts: Record<string, unknown>[] = [];

    // visibility por grupo
    if (settings.visibility.enabled) {
      const allowed = visibleValuesForCtx(settings, ctx);
      if (allowed.length === 0) {
        // Nenhum grupo do usuário vê qualquer valor — bloqueia tudo
        restrictiveParts.push({
          [settings.visibility.fieldSlug]: { $in: ['__BLOCKED__'] },
        });
      } else {
        restrictiveParts.push({
          [settings.visibility.fieldSlug]: { $in: allowed },
        });
      }
    }

    // visibility por campo USER_GROUP: row visível se algum grupo do usuário
    // está entre os grupos gravados no campo.
    if (settings.fieldVisibility.enabled) {
      const slug = settings.fieldVisibility.fieldSlug;
      const groupIds = [...ctx.groupIds];
      if (groupIds.length === 0) {
        restrictiveParts.push({ [slug]: { $in: ['__BLOCKED__'] } });
      } else {
        restrictiveParts.push({ [slug]: { $in: groupIds } });
      }
    }

    // dateWindow
    const dateFrag = buildDateWindowQuery(settings.dateWindow, new Date());
    if (Object.keys(dateFrag).length > 0) restrictiveParts.push(dateFrag);

    const restrictive = this.combineRestrictiveParts(restrictiveParts);

    // creator-bypass
    if (!settings.creatorBypass.enabled) return restrictive;

    const permissive = { creator: ctx.userId };

    if (Object.keys(restrictive).length === 0) {
      // sem restrições — creator-bypass não adiciona nada útil
      return {};
    }

    return { $or: [restrictive, permissive] };
  }

  private combineRestrictiveParts(
    parts: Record<string, unknown>[],
  ): Record<string, unknown> {
    if (parts.length === 0) return {};
    if (parts.length === 1) return parts[0]!;
    return { $and: parts };
  }

  /**
   * Tri-state:
   *  - creator-bypass match → 'allow' (vence visibility/dateWindow)
   *  - visibility bloqueia → 'deny'
   *  - dateWindow bloqueia → 'deny'
   *  - tudo OK → 'abstain'
   */
  canRead(
    row: IRow,
    ctx: GuardEvalContext,
    _table: ITable,
    rawSettings: Record<string, unknown>,
  ): GuardAccessDecision {
    const settings = parseSettings(rawSettings);

    // 1. Creator bypass (allow vence tudo)
    if (settings.creatorBypass.enabled && rowCreatorMatchesUser(row, ctx)) {
      return 'allow';
    }

    // 2. Visibility por grupo
    if (settings.visibility.enabled) {
      if (!ctx.userId) return 'deny'; // visitante
      const vis = readVisibility(row, settings.visibility.fieldSlug);
      if (!ctxCanSeeValue(settings, vis, ctx)) return 'deny';
    }

    // 2b. Visibility por campo USER_GROUP
    if (settings.fieldVisibility.enabled) {
      if (!ctx.userId) return 'deny'; // visitante
      const rowGroups = readGroupIds(row, settings.fieldVisibility.fieldSlug);
      if (!ctxIntersectsRowGroups(rowGroups, ctx)) return 'deny';
    }

    // 3. Date-window
    if (!rowPassesDateWindow(row, settings.dateWindow, new Date())) {
      return 'deny';
    }

    return 'abstain';
  }

  /**
   * Write decisions:
   *  - creator bypass aprova update/delete da própria row
   *  - tentar setar visibility para valor que ctx não pode ver → deny
   *  - resto → abstain
   */
  canWrite(
    currentRow: IRow | null,
    ctx: GuardEvalContext,
    _table: ITable,
    payload: Record<string, unknown> | null,
    operation: 'create' | 'update' | 'delete',
    rawSettings: Record<string, unknown>,
  ): GuardWriteDecision {
    const settings = parseSettings(rawSettings);

    // 1. Creator bypass (update/delete)
    if (
      settings.creatorBypass.enabled &&
      operation !== 'create' &&
      rowCreatorMatchesUser(currentRow, ctx)
    ) {
      return { decision: 'allow' };
    }

    // 2. Visibility: bloquear payload com valor não permitido para o ctx
    if (settings.visibility.enabled && payload && ctx.userId) {
      const incoming = readVisibility(payload, settings.visibility.fieldSlug);
      if (incoming && !ctxCanSeeValue(settings, incoming, ctx)) {
        return { decision: 'deny', reason: 'ROW_WRITE_RESTRICTED' };
      }
    }

    // 2b. Visibility por campo USER_GROUP: só edita/remove row cujos grupos
    // intersectam os do usuário (criador e privilegiado já saíram acima).
    if (
      settings.fieldVisibility.enabled &&
      operation !== 'create' &&
      ctx.userId
    ) {
      const rowGroups = readGroupIds(
        currentRow ?? undefined,
        settings.fieldVisibility.fieldSlug,
      );
      if (!ctxIntersectsRowGroups(rowGroups, ctx)) {
        return { decision: 'deny', reason: 'ROW_WRITE_RESTRICTED' };
      }
    }

    return { decision: 'abstain' };
  }

  /**
   * Sanitize visibility no payload:
   *  - create: se ctx não escolheu valor permitido, atribui defaultValue
   *  - update: preserva valor atual da row se payload tentar valor proibido
   *
   * Date-window e creator-bypass não sanitizam payloads.
   */
  sanitizeWritePayload(
    payload: Record<string, unknown>,
    ctx: GuardEvalContext,
    _table: ITable,
    operation: 'create' | 'update',
    currentRow: IRow | null,
    rawSettings: Record<string, unknown>,
  ): Record<string, unknown> {
    const settings = parseSettings(rawSettings);
    if (!settings.visibility.enabled) return payload;
    if (!ctx.userId) return payload; // visitante — não sanitiza

    const slug = settings.visibility.fieldSlug;
    const incoming = readVisibility(payload, slug);
    const incomingAllowed =
      incoming != null && ctxCanSeeValue(settings, incoming, ctx);

    if (operation === 'create') {
      if (incomingAllowed) {
        return { ...payload, [slug]: asVisibilityArray(incoming) };
      }
      // força o primeiro valor visível ou o defaultValue
      const fallback = visibleValuesForCtx(settings, ctx)[0];
      const defaultVisible = ctxCanSeeValue(
        settings,
        settings.visibility.defaultValue,
        ctx,
      );
      const finalValue = this.resolveCreateFallback(
        settings,
        defaultVisible,
        fallback,
      );
      return { ...payload, [slug]: asVisibilityArray(finalValue) };
    }

    // update: preserva valor atual se incoming proibido; normaliza para array
    if (incomingAllowed) {
      return { ...payload, [slug]: asVisibilityArray(incoming) };
    }
    const currentValue =
      readVisibility(currentRow ?? undefined, slug) ??
      settings.visibility.defaultValue;
    return { ...payload, [slug]: asVisibilityArray(currentValue) };
  }

  private resolveCreateFallback(
    settings: RowAccessSettings,
    defaultVisible: boolean,
    fallback: string | undefined,
  ): string {
    if (defaultVisible) return settings.visibility.defaultValue;
    return fallback ?? settings.visibility.defaultValue;
  }
}
