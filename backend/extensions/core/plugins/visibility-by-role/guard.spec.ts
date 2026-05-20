import { describe, it, expect } from 'vitest';

import { E_ROLE, E_VISIBILITY } from '@application/core/entity.core';

import { VisibilityByRoleGuard } from './guard';

const ROLES = [
  E_ROLE.MASTER,
  E_ROLE.ADMINISTRATOR,
  E_ROLE.MANAGER,
  E_ROLE.REGISTERED,
] as const;
const VISIBILITIES = [
  E_VISIBILITY.PUBLIC,
  E_VISIBILITY.SIGILOSO,
  undefined,
] as const;

function makeUser(role: string): any {
  return { _id: 'u1', email: 'u@x', role };
}

function makeRow(visibility: string | undefined): any {
  // IRow is flat (Merge<Base, Record<string, unknown>>) — fields ficam no top-level,
  // não em data.*. Mongoose tambem nao nest: model.create(payload.data) espalha direto.
  return { _id: 'r1', visibility };
}

const TABLE: any = { _id: 'T1', slug: 't1', fields: [] };

describe('VisibilityByRoleGuard.canRead', () => {
  it.each(ROLES.flatMap((role) => VISIBILITIES.map((vis) => ({ role, vis }))))(
    'role=$role visibility=$vis',
    ({ role, vis }) => {
      const result = VisibilityByRoleGuard.canRead(
        makeRow(vis),
        makeUser(role),
        TABLE,
      );
      const isAdmin = role === E_ROLE.MASTER || role === E_ROLE.ADMINISTRATOR;
      const isPublic = vis === E_VISIBILITY.PUBLIC;
      expect(result).toBe(isAdmin || isPublic);
    },
  );

  it('user undefined: comporta-se como nao-admin', () => {
    expect(
      VisibilityByRoleGuard.canRead(makeRow('PUBLIC'), undefined, TABLE),
    ).toBe(true);
    expect(
      VisibilityByRoleGuard.canRead(makeRow('SIGILOSO'), undefined, TABLE),
    ).toBe(false);
  });
});

describe('VisibilityByRoleGuard.adjustListQuery', () => {
  it('admin: query inalterada', () => {
    const q = { foo: 1 };
    expect(
      VisibilityByRoleGuard.adjustListQuery(q, makeUser(E_ROLE.MASTER), TABLE),
    ).toEqual(q);
    expect(
      VisibilityByRoleGuard.adjustListQuery(
        q,
        makeUser(E_ROLE.ADMINISTRATOR),
        TABLE,
      ),
    ).toEqual(q);
  });

  it('nao-admin: adiciona filtro visibility=PUBLIC', () => {
    expect(
      VisibilityByRoleGuard.adjustListQuery(
        { foo: 1 },
        makeUser(E_ROLE.MANAGER),
        TABLE,
      ),
    ).toEqual({
      foo: 1,
      visibility: E_VISIBILITY.PUBLIC,
    });
  });

  it('user undefined: adiciona filtro', () => {
    expect(VisibilityByRoleGuard.adjustListQuery({}, undefined, TABLE)).toEqual(
      {
        visibility: E_VISIBILITY.PUBLIC,
      },
    );
  });
});

describe('VisibilityByRoleGuard.canWrite', () => {
  it('MASTER: allowed em qualquer caso', () => {
    expect(
      VisibilityByRoleGuard.canWrite(
        null,
        makeUser(E_ROLE.MASTER),
        TABLE,
        { visibility: 'SIGILOSO' },
        'create',
      ),
    ).toEqual({ allowed: true });
  });

  it('MANAGER setando SIGILOSO: bloqueado', () => {
    const r = VisibilityByRoleGuard.canWrite(
      null,
      makeUser(E_ROLE.MANAGER),
      TABLE,
      { visibility: 'SIGILOSO' },
      'create',
    );
    expect(r.allowed).toBe(false);
  });

  it('MANAGER setando PUBLIC: allowed', () => {
    expect(
      VisibilityByRoleGuard.canWrite(
        null,
        makeUser(E_ROLE.MANAGER),
        TABLE,
        { visibility: 'PUBLIC' },
        'create',
      ),
    ).toEqual({ allowed: true });
  });

  it('payload null (delete): allowed para nao-admin (canRead ja barrou se necessario)', () => {
    expect(
      VisibilityByRoleGuard.canWrite(
        makeRow('PUBLIC'),
        makeUser(E_ROLE.MANAGER),
        TABLE,
        null,
        'delete',
      ),
    ).toEqual({ allowed: true });
  });
});

describe('VisibilityByRoleGuard.sanitizeWritePayload', () => {
  it('non-admin create: forca PUBLIC mesmo se SIGILOSO no payload', () => {
    const r = VisibilityByRoleGuard.sanitizeWritePayload(
      { nome: 'x', visibility: 'SIGILOSO' },
      makeUser(E_ROLE.MANAGER),
      TABLE,
      'create',
      null,
    );
    expect(r.visibility).toBe(E_VISIBILITY.PUBLIC);
  });

  it('non-admin update: preserva o valor da row atual (nao permite trocar)', () => {
    const r = VisibilityByRoleGuard.sanitizeWritePayload(
      { nome: 'x', visibility: 'SIGILOSO' },
      makeUser(E_ROLE.MANAGER),
      TABLE,
      'update',
      makeRow('PUBLIC'),
    );
    expect(r.visibility).toBe(E_VISIBILITY.PUBLIC);
  });

  it('admin: payload preservado', () => {
    const r = VisibilityByRoleGuard.sanitizeWritePayload(
      { visibility: 'SIGILOSO' },
      makeUser(E_ROLE.ADMINISTRATOR),
      TABLE,
      'update',
      makeRow('PUBLIC'),
    );
    expect(r.visibility).toBe(E_VISIBILITY.SIGILOSO);
  });
});
