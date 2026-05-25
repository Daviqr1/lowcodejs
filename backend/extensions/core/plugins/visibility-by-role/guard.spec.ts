/**
 * guard.spec.ts — VisibilityByRoleGuard v2
 *
 * Testa o guard com o novo contrato tri-state.
 * NOTA: Admin bypass (MASTER/ADMINISTRATOR) é aplicado no RowAccessGuardService,
 * NÃO no guard. O guard pode receber qualquer role, mas na prática nunca recebe admin.
 */
import { describe, it, expect } from 'vitest';

import { E_ROLE, E_VISIBILITY } from '@application/core/entity.core';

import { VisibilityByRoleGuard } from './guard';

const SETTINGS = {};
const TABLE: any = { _id: 'T1', slug: 't1', fields: [] };

function makeUser(role: string): any {
  return { _id: 'u1', email: 'u@x', role };
}

function makeRow(visibility: string | undefined): any {
  // IRow is flat — fields top-level. DROPDOWN = array even with multiple=false.
  return {
    _id: 'r1',
    visibility: visibility === undefined ? undefined : [visibility],
  };
}

describe('VisibilityByRoleGuard.category', () => {
  it('é restrictive', () => {
    expect(VisibilityByRoleGuard.category).toBe('restrictive');
  });
});

describe('VisibilityByRoleGuard.canRead', () => {
  it('row PUBLIC: abstain (não bloqueia)', () => {
    expect(
      VisibilityByRoleGuard.canRead(
        makeRow(E_VISIBILITY.PUBLIC),
        makeUser(E_ROLE.MANAGER),
        TABLE,
        SETTINGS,
      ),
    ).toBe('abstain');
  });

  it('row SIGILOSO + MANAGER: deny', () => {
    expect(
      VisibilityByRoleGuard.canRead(
        makeRow(E_VISIBILITY.SIGILOSO),
        makeUser(E_ROLE.MANAGER),
        TABLE,
        SETTINGS,
      ),
    ).toBe('deny');
  });

  it('row SIGILOSO + REGISTERED: deny', () => {
    expect(
      VisibilityByRoleGuard.canRead(
        makeRow(E_VISIBILITY.SIGILOSO),
        makeUser(E_ROLE.REGISTERED),
        TABLE,
        SETTINGS,
      ),
    ).toBe('deny');
  });

  it('row sem visibility (undefined): deny (visibility desconhecida = sigilosa por padrão)', () => {
    expect(
      VisibilityByRoleGuard.canRead(
        makeRow(undefined),
        makeUser(E_ROLE.MANAGER),
        TABLE,
        SETTINGS,
      ),
    ).toBe('deny');
  });

  it('user undefined + PUBLIC: abstain', () => {
    expect(
      VisibilityByRoleGuard.canRead(
        makeRow(E_VISIBILITY.PUBLIC),
        undefined,
        TABLE,
        SETTINGS,
      ),
    ).toBe('abstain');
  });

  it('user undefined + SIGILOSO: deny', () => {
    expect(
      VisibilityByRoleGuard.canRead(
        makeRow(E_VISIBILITY.SIGILOSO),
        undefined,
        TABLE,
        SETTINGS,
      ),
    ).toBe('deny');
  });

  it('nunca retorna allow (guard é restrictive)', () => {
    const visibilities = [
      E_VISIBILITY.PUBLIC,
      E_VISIBILITY.SIGILOSO,
      undefined,
    ];
    const roles = [
      E_ROLE.MASTER,
      E_ROLE.ADMINISTRATOR,
      E_ROLE.MANAGER,
      E_ROLE.REGISTERED,
    ];
    for (const vis of visibilities) {
      for (const role of roles) {
        const d = VisibilityByRoleGuard.canRead(
          makeRow(vis),
          makeUser(role),
          TABLE,
          SETTINGS,
        );
        expect(d).not.toBe('allow');
      }
    }
  });
});

describe('VisibilityByRoleGuard.adjustListQuery', () => {
  it('sempre adiciona filtro visibility=PUBLIC (admin bypass no service, não aqui)', () => {
    // Guard doesn't know about admin — service bypasses before calling adjustListQuery
    expect(
      VisibilityByRoleGuard.adjustListQuery(
        { foo: 1 },
        makeUser(E_ROLE.MANAGER),
        TABLE,
        SETTINGS,
      ),
    ).toEqual({ foo: 1, visibility: E_VISIBILITY.PUBLIC });

    expect(
      VisibilityByRoleGuard.adjustListQuery(
        { foo: 1 },
        makeUser(E_ROLE.MASTER),
        TABLE,
        SETTINGS,
      ),
    ).toEqual({ foo: 1, visibility: E_VISIBILITY.PUBLIC });
  });

  it('user undefined: adiciona filtro', () => {
    expect(
      VisibilityByRoleGuard.adjustListQuery({}, undefined, TABLE, SETTINGS),
    ).toEqual({ visibility: E_VISIBILITY.PUBLIC });
  });
});

describe('VisibilityByRoleGuard.canWrite', () => {
  it('MANAGER setando SIGILOSO: deny com reason', () => {
    const r = VisibilityByRoleGuard.canWrite(
      null,
      makeUser(E_ROLE.MANAGER),
      TABLE,
      { visibility: ['SIGILOSO'] },
      'create',
      SETTINGS,
    );
    expect(r.decision).toBe('deny');
    if (r.decision === 'deny') expect(r.reason).toBe('ROW_WRITE_RESTRICTED');
  });

  it('MANAGER setando PUBLIC: abstain', () => {
    expect(
      VisibilityByRoleGuard.canWrite(
        null,
        makeUser(E_ROLE.MANAGER),
        TABLE,
        { visibility: ['PUBLIC'] },
        'create',
        SETTINGS,
      ),
    ).toEqual({ decision: 'abstain' });
  });

  it('payload null (delete): abstain (canRead já tratou)', () => {
    expect(
      VisibilityByRoleGuard.canWrite(
        makeRow(E_VISIBILITY.PUBLIC),
        makeUser(E_ROLE.MANAGER),
        TABLE,
        null,
        'delete',
        SETTINGS,
      ),
    ).toEqual({ decision: 'abstain' });
  });

  it('payload vazio (sem visibility): abstain', () => {
    expect(
      VisibilityByRoleGuard.canWrite(
        null,
        makeUser(E_ROLE.MANAGER),
        TABLE,
        { nome: 'x' },
        'create',
        SETTINGS,
      ),
    ).toEqual({ decision: 'abstain' });
  });

  it('nunca retorna allow (guard é restrictive)', () => {
    const r = VisibilityByRoleGuard.canWrite(
      null,
      makeUser(E_ROLE.MASTER),
      TABLE,
      { visibility: ['SIGILOSO'] },
      'create',
      SETTINGS,
    );
    // Even MASTER calling guard directly would get deny — but service bypasses admin
    expect(r.decision).not.toBe('allow');
  });
});

describe('VisibilityByRoleGuard.sanitizeWritePayload', () => {
  it('create: força PUBLIC mesmo se SIGILOSO no payload', () => {
    const r = VisibilityByRoleGuard.sanitizeWritePayload(
      { nome: 'x', visibility: ['SIGILOSO'] },
      makeUser(E_ROLE.MANAGER),
      TABLE,
      'create',
      null,
      SETTINGS,
    );
    expect(r.visibility).toEqual([E_VISIBILITY.PUBLIC]);
  });

  it('update: preserva o valor da row atual', () => {
    const r = VisibilityByRoleGuard.sanitizeWritePayload(
      { nome: 'x', visibility: ['SIGILOSO'] },
      makeUser(E_ROLE.MANAGER),
      TABLE,
      'update',
      makeRow(E_VISIBILITY.PUBLIC),
      SETTINGS,
    );
    expect(r.visibility).toEqual([E_VISIBILITY.PUBLIC]);
  });

  it('update sem currentRow: usa PUBLIC como fallback', () => {
    const r = VisibilityByRoleGuard.sanitizeWritePayload(
      { nome: 'x' },
      makeUser(E_ROLE.MANAGER),
      TABLE,
      'update',
      null,
      SETTINGS,
    );
    expect(r.visibility).toEqual([E_VISIBILITY.PUBLIC]);
  });
});
