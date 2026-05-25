/**
 * guard.spec.ts — CreatorBypassGuard
 *
 * Testa o guard permissivo de bypass pelo criador.
 * NOTA: Admin bypass (MASTER/ADMINISTRATOR) é aplicado no RowAccessGuardService,
 * NÃO no guard. O guard pode receber qualquer role, mas na prática nunca recebe admin.
 */
import { describe, expect, it } from 'vitest';

import { CreatorBypassGuard, CREATOR_BYPASS_PLUGIN_KEY } from './guard';

const SETTINGS = {};
const TABLE: any = { _id: 'T1', slug: 't1', fields: [] };

function makeUser(sub: string, role = 'MANAGER'): any {
  return { sub, email: `${sub}@test.com`, role };
}

function makeRow(creatorSub: string | undefined): any {
  return { _id: 'r1', creator: creatorSub };
}

// ── Metadados ─────────────────────────────────────────────────────────────────

describe('CreatorBypassGuard — metadados', () => {
  it('pluginKey é core:creator-bypass', () => {
    expect(CreatorBypassGuard.pluginKey).toBe('core:creator-bypass');
    expect(CreatorBypassGuard.pluginKey).toBe(CREATOR_BYPASS_PLUGIN_KEY);
  });

  it('category é permissive', () => {
    expect(CreatorBypassGuard.category).toBe('permissive');
  });

  it('supportsScopeAll é true', () => {
    expect(CreatorBypassGuard.supportsScopeAll).toBe(true);
  });

  it('settingsSchema é undefined (sem config)', () => {
    expect(CreatorBypassGuard.settingsSchema).toBeUndefined();
  });
});

// ── onTableBound ──────────────────────────────────────────────────────────────

describe('CreatorBypassGuard.onTableBound', () => {
  it('retorna Right({ wasCreated: false }) — sem setup necessário', async () => {
    const result = await CreatorBypassGuard.onTableBound(TABLE, SETTINGS);
    expect(result.isRight()).toBe(true);
    expect(result.value).toEqual({ wasCreated: false });
  });
});

// ── canRead ───────────────────────────────────────────────────────────────────

describe('CreatorBypassGuard.canRead', () => {
  it('user.sub === row.creator → allow (bypass permissivo)', () => {
    expect(
      CreatorBypassGuard.canRead(
        makeRow('user-123'),
        makeUser('user-123'),
        TABLE,
        SETTINGS,
      ),
    ).toBe('allow');
  });

  it('user.sub !== row.creator → abstain', () => {
    expect(
      CreatorBypassGuard.canRead(
        makeRow('user-999'),
        makeUser('user-123'),
        TABLE,
        SETTINGS,
      ),
    ).toBe('abstain');
  });

  it('user undefined → abstain (sem autenticação)', () => {
    expect(
      CreatorBypassGuard.canRead(
        makeRow('user-123'),
        undefined,
        TABLE,
        SETTINGS,
      ),
    ).toBe('abstain');
  });

  it('row.creator undefined → abstain', () => {
    expect(
      CreatorBypassGuard.canRead(
        makeRow(undefined),
        makeUser('user-123'),
        TABLE,
        SETTINGS,
      ),
    ).toBe('abstain');
  });

  it('row.creator string vazia → abstain', () => {
    expect(
      CreatorBypassGuard.canRead(
        makeRow(''),
        makeUser('user-123'),
        TABLE,
        SETTINGS,
      ),
    ).toBe('abstain');
  });
});

// ── canWrite ──────────────────────────────────────────────────────────────────

describe('CreatorBypassGuard.canWrite — create', () => {
  it('create: sempre abstain (não há row para verificar ownership)', () => {
    expect(
      CreatorBypassGuard.canWrite(
        null,
        makeUser('user-123'),
        TABLE,
        { nome: 'x' },
        'create',
        SETTINGS,
      ),
    ).toEqual({ decision: 'abstain' });
  });

  it('create: abstain mesmo com row passada (situação anômala)', () => {
    expect(
      CreatorBypassGuard.canWrite(
        makeRow('user-123'),
        makeUser('user-123'),
        TABLE,
        { nome: 'x' },
        'create',
        SETTINGS,
      ),
    ).toEqual({ decision: 'abstain' });
  });
});

describe('CreatorBypassGuard.canWrite — update', () => {
  it('update: user é criador → allow', () => {
    expect(
      CreatorBypassGuard.canWrite(
        makeRow('user-123'),
        makeUser('user-123'),
        TABLE,
        { nome: 'novo' },
        'update',
        SETTINGS,
      ),
    ).toEqual({ decision: 'allow' });
  });

  it('update: user não é criador → abstain', () => {
    expect(
      CreatorBypassGuard.canWrite(
        makeRow('user-999'),
        makeUser('user-123'),
        TABLE,
        { nome: 'novo' },
        'update',
        SETTINGS,
      ),
    ).toEqual({ decision: 'abstain' });
  });

  it('update: currentRow null → abstain', () => {
    expect(
      CreatorBypassGuard.canWrite(
        null,
        makeUser('user-123'),
        TABLE,
        { nome: 'novo' },
        'update',
        SETTINGS,
      ),
    ).toEqual({ decision: 'abstain' });
  });
});

describe('CreatorBypassGuard.canWrite — delete', () => {
  it('delete: user é criador → allow', () => {
    expect(
      CreatorBypassGuard.canWrite(
        makeRow('user-123'),
        makeUser('user-123'),
        TABLE,
        null,
        'delete',
        SETTINGS,
      ),
    ).toEqual({ decision: 'allow' });
  });

  it('delete: user não é criador → abstain', () => {
    expect(
      CreatorBypassGuard.canWrite(
        makeRow('user-456'),
        makeUser('user-123'),
        TABLE,
        null,
        'delete',
        SETTINGS,
      ),
    ).toEqual({ decision: 'abstain' });
  });

  it('delete: user undefined → abstain', () => {
    expect(
      CreatorBypassGuard.canWrite(
        makeRow('user-123'),
        undefined,
        TABLE,
        null,
        'delete',
        SETTINGS,
      ),
    ).toEqual({ decision: 'abstain' });
  });
});

// ── adjustListQuery ───────────────────────────────────────────────────────────

describe('CreatorBypassGuard.adjustListQuery', () => {
  it('sem user → {} (sentinel: service filtra antes de incluir no $or)', () => {
    expect(
      CreatorBypassGuard.adjustListQuery({}, undefined, TABLE, SETTINGS),
    ).toEqual({});
  });

  it('com user → { creator: user.sub }', () => {
    expect(
      CreatorBypassGuard.adjustListQuery(
        {},
        makeUser('user-123'),
        TABLE,
        SETTINGS,
      ),
    ).toEqual({ creator: 'user-123' });
  });

  it('ignora o baseQuery passado (fragmento independente)', () => {
    expect(
      CreatorBypassGuard.adjustListQuery(
        { foo: 1, bar: 2 },
        makeUser('user-abc'),
        TABLE,
        SETTINGS,
      ),
    ).toEqual({ creator: 'user-abc' });
  });
});

// ── sanitizeWritePayload ──────────────────────────────────────────────────────

describe('CreatorBypassGuard.sanitizeWritePayload', () => {
  it('retorna o payload sem modificações (identity — permissive não sanitiza)', () => {
    const payload = { nome: 'Teste', valor: 42, visibility: ['PUBLIC'] };
    const result = CreatorBypassGuard.sanitizeWritePayload(
      payload,
      makeUser('user-123'),
      TABLE,
      'create',
      null,
      SETTINGS,
    );
    expect(result).toEqual(payload);
    expect(result).toBe(payload); // mesma referência — sem cópia
  });

  it('identity em update também', () => {
    const payload = { nome: 'Atualizado' };
    const result = CreatorBypassGuard.sanitizeWritePayload(
      payload,
      makeUser('user-123'),
      TABLE,
      'update',
      makeRow('user-123'),
      SETTINGS,
    );
    expect(result).toBe(payload);
  });
});
