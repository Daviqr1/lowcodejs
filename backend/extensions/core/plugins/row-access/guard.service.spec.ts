import { describe, expect, it } from 'vitest';

import type { GuardEvalContext } from '@application/core/row-access-guard.contract';
import { EntityFixtures } from '@application/repositories/entity-fixtures';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryModelBuilder from '@application/services/table/in-memory-model-builder.service';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';

import { RowAccessControlGuard } from './guard.service';
import {
  DEFAULT_ROW_ACCESS_SETTINGS,
  type RowAccessSettings,
} from './settings-schema';

const fixtures = new EntityFixtures();

// Testes de métodos puros (adjustListQuery/canRead/canWrite/sanitizeWritePayload):
// não tocam nas deps (só onTableBound usa). O guard agora é @Service, então
// instanciamos com repositórios/builders in-memory.
const guard = new RowAccessControlGuard(
  new FieldInMemoryRepository(),
  new TableInMemoryRepository(),
  new RowInMemoryRepository(),
  new InMemorySchemaBuilder(),
  new InMemoryModelBuilder(),
);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Cria um GuardEvalContext sem precisar de GroupResolverContractService real. */
function makeCtx(
  groupIds: string[] = [],
  userId = 'u1',
  isPrivileged = false,
): GuardEvalContext {
  return {
    user: undefined,
    userId,
    groupIds: new Set(groupIds),
    isPrivileged,
  };
}

function makeVisitorCtx(): GuardEvalContext {
  return {
    user: undefined,
    userId: undefined,
    groupIds: new Set(),
    isPrivileged: false,
  };
}

/**
 * Settings com groupMatrix mapeando 'PUBLIC' e 'INTERNO' para o grupo 'g-manager',
 * 'RESTRITO' e 'SIGILOSO' para o grupo 'g-admin'.
 */
function makeGroupSettings(
  overrides?: Partial<RowAccessSettings>,
): RowAccessSettings {
  return {
    visibility: {
      enabled: true,
      fieldSlug: 'visibility',
      values: ['PUBLIC', 'INTERNO', 'RESTRITO', 'SIGILOSO'],
      groupMatrix: {
        PUBLIC: ['g-manager', 'g-admin'],
        INTERNO: ['g-manager', 'g-admin'],
        RESTRITO: ['g-admin'],
        SIGILOSO: ['g-admin'],
      },
      defaultValue: 'PUBLIC',
    },
    fieldVisibility: { enabled: false, fieldSlug: '' },
    creatorBypass: { enabled: true },
    dateWindow: { mode: 'off' },
    ...overrides,
  };
}

// Narrows para ler o formato dinâmico da query Mongo sem asserção.
function orClauses(q: Record<string, unknown>): Array<Record<string, unknown>> {
  const or = q['$or'];
  if (!Array.isArray(or)) return [];
  return or.filter(
    (c): c is Record<string, unknown> => typeof c === 'object' && c !== null,
  );
}
function andClauses(
  clause: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const and = clause['$and'];
  if (!Array.isArray(and)) return [];
  return and.filter(
    (c): c is Record<string, unknown> => typeof c === 'object' && c !== null,
  );
}
function visibilityIn(clause: Record<string, unknown>): string[] {
  const vis = clause['visibility'];
  if (
    vis &&
    typeof vis === 'object' &&
    '$in' in vis &&
    Array.isArray(vis.$in)
  ) {
    return vis.$in.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

const baseTable = fixtures.makeTable({
  _id: 'tab1',
  name: 'Docs',
  slug: 'docs',
});

// ── shape ─────────────────────────────────────────────────────────────────────

describe('RowAccessControlGuard shape', () => {
  it('possui pluginKey, category, supportsScopeAll, defaultSettings e settingsSchema', () => {
    expect(guard.pluginKey).toBe('core:row-access');
    expect(guard.category).toBe('restrictive');
    expect(guard.supportsScopeAll).toBe(false);
    expect(guard.settingsSchema).toBeDefined();
    expect(guard.defaultSettings).toBeDefined();
  });
});

// ── adjustListQuery ───────────────────────────────────────────────────────────

describe('guard.adjustListQuery', () => {
  it('visitante (sem userId) retorna query bloqueante para evitar list-leak', () => {
    const settings = makeGroupSettings();
    const q = guard.adjustListQuery({}, makeVisitorCtx(), baseTable, settings);
    // FIX 1: quando visibility está habilitada e não há userId,
    // deve bloquear (não vazar a lista inteira para visitantes)
    expect(q).toEqual({
      [settings.visibility.fieldSlug]: { $in: ['__BLOCKED__'] },
    });
  });

  it('usuario no grupo g-manager com defaults: $or [visibility $in PUBLIC,INTERNO + creator]', () => {
    const settings = makeGroupSettings();
    const q = guard.adjustListQuery(
      {},
      makeCtx(['g-manager']),
      baseTable,
      settings,
    );
    expect(q).toHaveProperty('$or');
    const or = orClauses(q);
    expect(or).toHaveLength(2);
    expect(or[1]).toEqual({ creator: 'u1' });
    const vis = visibilityIn(or[0]);
    expect(vis).toContain('PUBLIC');
    expect(vis).toContain('INTERNO');
    expect(vis).not.toContain('RESTRITO');
    expect(vis).not.toContain('SIGILOSO');
  });

  it('usuario sem grupo nenhum: visibility bloqueada para __BLOCKED__ + creator escape', () => {
    const settings = makeGroupSettings();
    const q = guard.adjustListQuery({}, makeCtx([]), baseTable, settings);
    const or = orClauses(q);
    expect(or[0]).toEqual({ visibility: { $in: ['__BLOCKED__'] } });
    expect(or[1]).toEqual({ creator: 'u1' });
  });

  it('creator-bypass off + visibility on: retorna restritivo direto (sem $or)', () => {
    const settings = makeGroupSettings({
      creatorBypass: { enabled: false },
    });
    const q = guard.adjustListQuery(
      {},
      makeCtx(['g-manager']),
      baseTable,
      settings,
    );
    expect(q).toHaveProperty('visibility');
    expect(q).not.toHaveProperty('$or');
  });

  it('date-window sliding adiciona createdAt $gte no restrictivo', () => {
    const settings = makeGroupSettings({
      dateWindow: { mode: 'createdAt-sliding', slidingDays: 7 },
    });
    const q = guard.adjustListQuery(
      {},
      makeCtx(['g-manager']),
      baseTable,
      settings,
    );
    const or = orClauses(q);
    const and = andClauses(or[0]);
    expect(and.length).toBeGreaterThan(0);
    const hasCreated = and.some((f) => 'createdAt' in f);
    expect(hasCreated).toBe(true);
  });

  it('visibility desabilitada + date-window off = {} (nada a contribuir)', () => {
    const settings: RowAccessSettings = {
      ...DEFAULT_ROW_ACCESS_SETTINGS,
      visibility: { ...DEFAULT_ROW_ACCESS_SETTINGS.visibility, enabled: false },
      creatorBypass: { enabled: false },
    };
    const q = guard.adjustListQuery(
      {},
      makeCtx(['g-manager']),
      baseTable,
      settings,
    );
    expect(q).toEqual({});
  });
});

// ── canRead ───────────────────────────────────────────────────────────────────

describe('guard.canRead', () => {
  it('creator-bypass: criador da row sempre allow', () => {
    const row = fixtures.makeRow({ creator: 'u1', visibility: ['SIGILOSO'] });
    const decision = guard.canRead(
      row,
      makeCtx(['g-manager'], 'u1'),
      baseTable,
      makeGroupSettings(),
    );
    expect(decision).toBe('allow');
  });

  it('usuario no g-manager lendo SIGILOSO de outro: deny', () => {
    const row = fixtures.makeRow({
      creator: 'other',
      visibility: ['SIGILOSO'],
    });
    const decision = guard.canRead(
      row,
      makeCtx(['g-manager'], 'u1'),
      baseTable,
      makeGroupSettings(),
    );
    expect(decision).toBe('deny');
  });

  it('usuario no g-manager lendo PUBLIC: abstain', () => {
    const row = fixtures.makeRow({ creator: 'other', visibility: ['PUBLIC'] });
    const decision = guard.canRead(
      row,
      makeCtx(['g-manager'], 'u1'),
      baseTable,
      makeGroupSettings(),
    );
    expect(decision).toBe('abstain');
  });

  it('usuario no g-admin lendo SIGILOSO: abstain', () => {
    const row = fixtures.makeRow({
      creator: 'other',
      visibility: ['SIGILOSO'],
    });
    const decision = guard.canRead(
      row,
      makeCtx(['g-admin'], 'u1'),
      baseTable,
      makeGroupSettings(),
    );
    expect(decision).toBe('abstain');
  });

  it('visitante: deny quando visibility habilitada', () => {
    const row = fixtures.makeRow({ creator: 'other', visibility: ['PUBLIC'] });
    const decision = guard.canRead(
      row,
      makeVisitorCtx(),
      baseTable,
      makeGroupSettings(),
    );
    expect(decision).toBe('deny');
  });

  it('date-window fora da janela: deny mesmo PUBLIC', () => {
    const settings = makeGroupSettings({
      creatorBypass: { enabled: false },
      dateWindow: { mode: 'createdAt-sliding', slidingDays: 1 },
    });
    const row = fixtures.makeRow({
      creator: 'other',
      visibility: ['PUBLIC'],
      createdAt: new Date(Date.now() - 10 * 86400000),
    });
    const decision = guard.canRead(
      row,
      makeCtx(['g-manager'], 'u1'),
      baseTable,
      settings,
    );
    expect(decision).toBe('deny');
  });

  it('date-window createdAt-fixed: dentro do intervalo = abstain', () => {
    const settings = makeGroupSettings({
      creatorBypass: { enabled: false },
      dateWindow: {
        mode: 'createdAt-fixed',
        fixedFrom: new Date(Date.now() - 10 * 86400000).toISOString(),
        fixedTo: new Date(Date.now() + 10 * 86400000).toISOString(),
      },
    });
    const row = fixtures.makeRow({
      creator: 'other',
      visibility: ['PUBLIC'],
      createdAt: new Date(),
    });
    const decision = guard.canRead(
      row,
      makeCtx(['g-manager'], 'u1'),
      baseTable,
      settings,
    );
    expect(decision).toBe('abstain');
  });
});

// ── canWrite ──────────────────────────────────────────────────────────────────

describe('guard.canWrite', () => {
  it('creator update: allow (criador edita propria row)', () => {
    const row = fixtures.makeRow({ creator: 'u1', visibility: ['PUBLIC'] });
    const decision = guard.canWrite(
      row,
      makeCtx(['g-manager'], 'u1'),
      baseTable,
      null,
      'update',
      makeGroupSettings(),
    );
    expect(decision).toEqual({ decision: 'allow' });
  });

  it('g-manager tentando setar SIGILOSO no payload: deny', () => {
    const decision = guard.canWrite(
      null,
      makeCtx(['g-manager'], 'u1'),
      baseTable,
      { visibility: ['SIGILOSO'] },
      'create',
      makeGroupSettings(),
    );
    expect(decision).toEqual({
      decision: 'deny',
      reason: 'ROW_WRITE_RESTRICTED',
    });
  });

  it('g-manager setando PUBLIC: abstain', () => {
    const decision = guard.canWrite(
      null,
      makeCtx(['g-manager'], 'u1'),
      baseTable,
      { visibility: ['PUBLIC'] },
      'create',
      makeGroupSettings(),
    );
    expect(decision).toEqual({ decision: 'abstain' });
  });

  it('g-admin setando SIGILOSO: abstain (grupo tem acesso)', () => {
    const decision = guard.canWrite(
      null,
      makeCtx(['g-admin'], 'u1'),
      baseTable,
      { visibility: ['SIGILOSO'] },
      'create',
      makeGroupSettings(),
    );
    expect(decision).toEqual({ decision: 'abstain' });
  });
});

// ── sanitizeWritePayload ──────────────────────────────────────────────────────

describe('guard.sanitizeWritePayload', () => {
  it('g-manager create com PUBLIC: normaliza para array', () => {
    const out = guard.sanitizeWritePayload(
      { nome: 'x', visibility: 'PUBLIC' },
      makeCtx(['g-manager'], 'u1'),
      baseTable,
      'create',
      null,
      makeGroupSettings(),
    );
    expect(out['visibility']).toEqual(['PUBLIC']);
  });

  it('g-manager create sem visibility: aplica defaultValue como array', () => {
    const out = guard.sanitizeWritePayload(
      { nome: 'x' },
      makeCtx(['g-manager'], 'u1'),
      baseTable,
      'create',
      null,
      makeGroupSettings(),
    );
    expect(out['visibility']).toEqual(['PUBLIC']);
  });

  it('g-manager update tentando SIGILOSO: preserva valor atual', () => {
    const current = fixtures.makeRow({ visibility: ['INTERNO'] });
    const out = guard.sanitizeWritePayload(
      { visibility: ['SIGILOSO'] },
      makeCtx(['g-manager'], 'u1'),
      baseTable,
      'update',
      current,
      makeGroupSettings(),
    );
    expect(out['visibility']).toEqual(['INTERNO']);
  });

  it('g-admin update com SIGILOSO: permite (grupo tem acesso)', () => {
    const current = fixtures.makeRow({ visibility: ['RESTRITO'] });
    const out = guard.sanitizeWritePayload(
      { visibility: ['SIGILOSO'] },
      makeCtx(['g-admin'], 'u1'),
      baseTable,
      'update',
      current,
      makeGroupSettings(),
    );
    expect(out['visibility']).toEqual(['SIGILOSO']);
  });

  it('visibility off: identity', () => {
    const settings: RowAccessSettings = {
      ...DEFAULT_ROW_ACCESS_SETTINGS,
      visibility: { ...DEFAULT_ROW_ACCESS_SETTINGS.visibility, enabled: false },
    };
    const out = guard.sanitizeWritePayload(
      { nome: 'x', visibility: 'PUBLIC' },
      makeCtx(['g-manager'], 'u1'),
      baseTable,
      'create',
      null,
      settings,
    );
    expect(out).toEqual({ nome: 'x', visibility: 'PUBLIC' });
  });

  it('visitante: identity (sem userId nao sanitiza)', () => {
    const out = guard.sanitizeWritePayload(
      { nome: 'x' },
      makeVisitorCtx(),
      baseTable,
      'create',
      null,
      makeGroupSettings(),
    );
    expect(out).toEqual({ nome: 'x' });
  });

  it('bypass de privilegiado — service nao chama sanitize; guard retorna identity independentemente', () => {
    // guard.sanitizeWritePayload recebe ctx.isPrivileged=true mas não tem bypass próprio
    // O bypass ocorre no service (antes de chamar o guard)
    // Aqui testamos apenas que o guard retorna o payload inalterado se o valor for permitido
    const out = guard.sanitizeWritePayload(
      { nome: 'x', visibility: 'SIGILOSO' },
      makeCtx(['g-admin'], 'u1', true),
      baseTable,
      'create',
      null,
      makeGroupSettings(),
    );
    // g-admin pode ver SIGILOSO, então normaliza
    expect(out['visibility']).toEqual(['SIGILOSO']);
  });
});

// ── fieldVisibility (visibility por campo USER_GROUP) ────────────────────────

/**
 * Settings só com fieldVisibility apontando para o campo 'grupos-acesso'
 * (visibility groupMatrix desabilitada). creatorBypass off por padrão para
 * isolar a decisão por grupo.
 */
function makeFieldVisibilitySettings(
  overrides?: Partial<RowAccessSettings>,
): RowAccessSettings {
  return {
    ...makeGroupSettings({
      visibility: {
        enabled: false,
        fieldSlug: 'visibility',
        values: ['PUBLIC', 'INTERNO'],
        groupMatrix: { PUBLIC: [], INTERNO: [] },
        defaultValue: 'PUBLIC',
      },
      creatorBypass: { enabled: false },
      ...overrides,
    }),
    fieldVisibility: { enabled: true, fieldSlug: 'grupos-acesso' },
  };
}

describe('guard.fieldVisibility (campo USER_GROUP)', () => {
  it('adjustListQuery: filtra rows cujo campo contém algum grupo do usuário', () => {
    const settings = makeFieldVisibilitySettings();
    const q = guard.adjustListQuery(
      {},
      makeCtx(['g-vendas', 'g-rh']),
      baseTable,
      settings,
    );
    expect(q).toEqual({ 'grupos-acesso': { $in: ['g-vendas', 'g-rh'] } });
  });

  it('adjustListQuery: usuário sem grupo é bloqueado', () => {
    const settings = makeFieldVisibilitySettings();
    const q = guard.adjustListQuery({}, makeCtx([]), baseTable, settings);
    expect(q).toEqual({ 'grupos-acesso': { $in: ['__BLOCKED__'] } });
  });

  it('adjustListQuery: visitante sem userId é bloqueado', () => {
    const settings = makeFieldVisibilitySettings();
    const q = guard.adjustListQuery({}, makeVisitorCtx(), baseTable, settings);
    expect(q).toEqual({ 'grupos-acesso': { $in: ['__BLOCKED__'] } });
  });

  it('canRead: allow (abstain) quando grupos intersectam', () => {
    const settings = makeFieldVisibilitySettings();
    const row = fixtures.makeRow({
      creator: 'other',
      'grupos-acesso': ['g-vendas'],
    });
    const decision = guard.canRead(
      row,
      makeCtx(['g-vendas']),
      baseTable,
      settings,
    );
    expect(decision).toBe('abstain');
  });

  it('canRead: deny quando não há interseção de grupos', () => {
    const settings = makeFieldVisibilitySettings();
    const row = fixtures.makeRow({
      creator: 'other',
      'grupos-acesso': ['g-rh'],
    });
    const decision = guard.canRead(
      row,
      makeCtx(['g-vendas']),
      baseTable,
      settings,
    );
    expect(decision).toBe('deny');
  });

  it('canRead: creator-bypass vence a restrição por grupo', () => {
    const settings = makeFieldVisibilitySettings({
      creatorBypass: { enabled: true },
    });
    const row = fixtures.makeRow({ creator: 'u1', 'grupos-acesso': ['g-rh'] });
    const decision = guard.canRead(
      row,
      makeCtx(['g-vendas']),
      baseTable,
      settings,
    );
    expect(decision).toBe('allow');
  });

  it('canRead: lê ids de grupo populados ({ _id })', () => {
    const settings = makeFieldVisibilitySettings();
    const row = fixtures.makeRow({
      creator: 'other',
      'grupos-acesso': [{ _id: 'g-vendas', name: 'Vendas' }],
    });
    const decision = guard.canRead(
      row,
      makeCtx(['g-vendas']),
      baseTable,
      settings,
    );
    expect(decision).toBe('abstain');
  });

  it('canWrite: deny update de row cujos grupos não intersectam', () => {
    const settings = makeFieldVisibilitySettings();
    const current = fixtures.makeRow({
      creator: 'other',
      'grupos-acesso': ['g-rh'],
    });
    const decision = guard.canWrite(
      current,
      makeCtx(['g-vendas']),
      baseTable,
      { nome: 'x' },
      'update',
      settings,
    );
    expect(decision.decision).toBe('deny');
  });

  it('canWrite: abstain no update quando grupos intersectam', () => {
    const settings = makeFieldVisibilitySettings();
    const current = fixtures.makeRow({
      creator: 'other',
      'grupos-acesso': ['g-vendas'],
    });
    const decision = guard.canWrite(
      current,
      makeCtx(['g-vendas']),
      baseTable,
      { nome: 'x' },
      'update',
      settings,
    );
    expect(decision.decision).toBe('abstain');
  });

  it('canWrite: create não é restringido por fieldVisibility', () => {
    const settings = makeFieldVisibilitySettings();
    const decision = guard.canWrite(
      null,
      makeCtx(['g-vendas']),
      baseTable,
      { nome: 'x', 'grupos-acesso': ['g-rh'] },
      'create',
      settings,
    );
    expect(decision.decision).toBe('abstain');
  });
});
