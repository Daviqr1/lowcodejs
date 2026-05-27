import { describe, expect, it } from 'vitest';

import {
  E_JWT_TYPE,
  E_ROLE,
  E_TABLE_COLLABORATION,
  E_TABLE_STYLE,
  E_TABLE_VISIBILITY,
} from '@application/core/entity.core';
import type { IJWTPayload, IRow, ITable } from '@application/core/entity.core';

import { RowAccessControlGuard } from './guard';
import {
  DEFAULT_ROW_ACCESS_SETTINGS,
  type RowAccessSettings,
} from './settings-schema';

function makeJwt(role: string, sub = 'u1'): IJWTPayload {
  return {
    sub,
    email: 'u@x.com',
    role: role as IJWTPayload['role'],
    type: E_JWT_TYPE.ACCESS,
  };
}

const baseTable: ITable = {
  _id: 'tab1',
  name: 'Docs',
  slug: 'docs',
  _schema: {},
  fields: [],
  groups: [],
  owner: 'u-owner',
  administrators: [],
  style: E_TABLE_STYLE.LIST,
  visibility: E_TABLE_VISIBILITY.RESTRICTED,
  collaboration: E_TABLE_COLLABORATION.RESTRICTED,
  fieldOrderList: [],
  fieldOrderForm: [],
  fieldOrderFilter: [],
  fieldOrderDetail: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  trashed: false,
  trashedAt: null,
} as unknown as ITable;

function makeRow(extra: Partial<Record<string, unknown>> = {}): IRow {
  return { _id: 'r1', ...extra } as unknown as IRow;
}

describe('RowAccessControlGuard', () => {
  describe('shape', () => {
    it('possui pluginKey, category, supportsScopeAll, defaultSettings e settingsSchema', () => {
      expect(RowAccessControlGuard.pluginKey).toBe('core:row-access');
      expect(RowAccessControlGuard.category).toBe('restrictive');
      expect(RowAccessControlGuard.supportsScopeAll).toBe(false);
      expect(RowAccessControlGuard.settingsSchema).toBeDefined();
      expect(RowAccessControlGuard.defaultSettings).toBeDefined();
    });
  });

  describe('adjustListQuery', () => {
    it('sem user retorna {} (admin bypass cuida)', () => {
      const q = RowAccessControlGuard.adjustListQuery(
        {},
        undefined,
        baseTable,
        DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<string, unknown>,
      );
      expect(q).toEqual({});
    });

    it('MANAGER com defaults: $or [restrictive AND creator]', () => {
      const q = RowAccessControlGuard.adjustListQuery(
        {},
        makeJwt(E_ROLE.MANAGER),
        baseTable,
        DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<string, unknown>,
      );
      expect(q).toHaveProperty('$or');
      const or = (q as { $or: Array<Record<string, unknown>> }).$or;
      expect(or).toHaveLength(2);
      // 0 = restritivo (visibility); 1 = creator
      expect(or[1]).toEqual({ creator: 'u1' });
      expect(or[0]).toHaveProperty('visibility');
    });

    it('REGISTERED com defaults: visibility limitada a PUBLIC + creator escape', () => {
      const q = RowAccessControlGuard.adjustListQuery(
        {},
        makeJwt(E_ROLE.REGISTERED),
        baseTable,
        DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<string, unknown>,
      );
      const or = (q as { $or: Array<Record<string, unknown>> }).$or;
      expect(or[0]).toEqual({ visibility: { $in: ['PUBLIC'] } });
      expect(or[1]).toEqual({ creator: 'u1' });
    });

    it('creator-bypass off + visibility on: retorna restritivo direto (sem $or)', () => {
      const settings: RowAccessSettings = {
        ...DEFAULT_ROW_ACCESS_SETTINGS,
        creatorBypass: { enabled: false },
      };
      const q = RowAccessControlGuard.adjustListQuery(
        {},
        makeJwt(E_ROLE.MANAGER),
        baseTable,
        settings as unknown as Record<string, unknown>,
      );
      expect(q).toHaveProperty('visibility');
      expect(q).not.toHaveProperty('$or');
    });

    it('date-window sliding adiciona createdAt $gte', () => {
      const settings: RowAccessSettings = {
        ...DEFAULT_ROW_ACCESS_SETTINGS,
        dateWindow: { mode: 'createdAt-sliding', slidingDays: 7 },
      };
      const q = RowAccessControlGuard.adjustListQuery(
        {},
        makeJwt(E_ROLE.MANAGER),
        baseTable,
        settings as unknown as Record<string, unknown>,
      );
      const or = (q as { $or: Array<Record<string, unknown>> }).$or;
      const restritivo = or[0] as { $and?: Array<Record<string, unknown>> };
      expect(restritivo.$and).toBeDefined();
      const hasCreated = restritivo.$and?.some(
        (f) => 'createdAt' in f,
      );
      expect(hasCreated).toBe(true);
    });
  });

  describe('canRead', () => {
    it('creator-bypass: criador da row sempre allow', () => {
      const row = makeRow({ creator: 'u1', visibility: ['SIGILOSO'] });
      const decision = RowAccessControlGuard.canRead(
        row,
        makeJwt(E_ROLE.MANAGER, 'u1'),
        baseTable,
        DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<string, unknown>,
      );
      expect(decision).toBe('allow');
    });

    it('MANAGER lendo SIGILOSO de outro: deny', () => {
      const row = makeRow({ creator: 'other', visibility: ['SIGILOSO'] });
      const decision = RowAccessControlGuard.canRead(
        row,
        makeJwt(E_ROLE.MANAGER, 'u1'),
        baseTable,
        DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<string, unknown>,
      );
      expect(decision).toBe('deny');
    });

    it('MANAGER lendo PUBLIC: abstain', () => {
      const row = makeRow({ creator: 'other', visibility: ['PUBLIC'] });
      const decision = RowAccessControlGuard.canRead(
        row,
        makeJwt(E_ROLE.MANAGER, 'u1'),
        baseTable,
        DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<string, unknown>,
      );
      expect(decision).toBe('abstain');
    });

    it('date-window fora da janela: deny mesmo PUBLIC', () => {
      const settings: RowAccessSettings = {
        ...DEFAULT_ROW_ACCESS_SETTINGS,
        creatorBypass: { enabled: false },
        dateWindow: { mode: 'createdAt-sliding', slidingDays: 1 },
      };
      const row = makeRow({
        creator: 'other',
        visibility: ['PUBLIC'],
        createdAt: new Date(Date.now() - 10 * 86400000),
      });
      const decision = RowAccessControlGuard.canRead(
        row,
        makeJwt(E_ROLE.MANAGER, 'u1'),
        baseTable,
        settings as unknown as Record<string, unknown>,
      );
      expect(decision).toBe('deny');
    });
  });

  describe('canWrite', () => {
    it('creator update: allow (criador edita propria row)', () => {
      const row = makeRow({ creator: 'u1', visibility: ['PUBLIC'] });
      const decision = RowAccessControlGuard.canWrite(
        row,
        makeJwt(E_ROLE.MANAGER, 'u1'),
        baseTable,
        null,
        'update',
        DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<string, unknown>,
      );
      expect(decision).toEqual({ decision: 'allow' });
    });

    it('MANAGER tentando setar SIGILOSO no payload: deny', () => {
      const decision = RowAccessControlGuard.canWrite(
        null,
        makeJwt(E_ROLE.MANAGER, 'u1'),
        baseTable,
        { visibility: ['SIGILOSO'] },
        'create',
        DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<string, unknown>,
      );
      expect(decision).toEqual({
        decision: 'deny',
        reason: 'ROW_WRITE_RESTRICTED',
      });
    });

    it('MANAGER setando PUBLIC: abstain', () => {
      const decision = RowAccessControlGuard.canWrite(
        null,
        makeJwt(E_ROLE.MANAGER, 'u1'),
        baseTable,
        { visibility: ['PUBLIC'] },
        'create',
        DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<string, unknown>,
      );
      expect(decision).toEqual({ decision: 'abstain' });
    });
  });

  describe('sanitizeWritePayload', () => {
    it('MANAGER create com PUBLIC: normaliza pra array', () => {
      const out = RowAccessControlGuard.sanitizeWritePayload(
        { nome: 'x', visibility: 'PUBLIC' },
        makeJwt(E_ROLE.MANAGER, 'u1'),
        baseTable,
        'create',
        null,
        DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<string, unknown>,
      );
      expect(out['visibility']).toEqual(['PUBLIC']);
    });

    it('MANAGER create sem visibility: aplica defaultValue como array', () => {
      const out = RowAccessControlGuard.sanitizeWritePayload(
        { nome: 'x' },
        makeJwt(E_ROLE.MANAGER, 'u1'),
        baseTable,
        'create',
        null,
        DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<string, unknown>,
      );
      expect(out['visibility']).toEqual(['PUBLIC']);
    });

    it('MANAGER update tentando SIGILOSO: preserva valor atual', () => {
      const current = makeRow({ visibility: ['INTERNO'] });
      const out = RowAccessControlGuard.sanitizeWritePayload(
        { visibility: ['SIGILOSO'] },
        makeJwt(E_ROLE.MANAGER, 'u1'),
        baseTable,
        'update',
        current,
        DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<string, unknown>,
      );
      expect(out['visibility']).toEqual(['INTERNO']);
    });

    it('visibility off: identity', () => {
      const settings: RowAccessSettings = {
        ...DEFAULT_ROW_ACCESS_SETTINGS,
        visibility: { ...DEFAULT_ROW_ACCESS_SETTINGS.visibility, enabled: false },
      };
      const out = RowAccessControlGuard.sanitizeWritePayload(
        { nome: 'x', visibility: 'PUBLIC' },
        makeJwt(E_ROLE.MANAGER, 'u1'),
        baseTable,
        'create',
        null,
        settings as unknown as Record<string, unknown>,
      );
      expect(out).toEqual({ nome: 'x', visibility: 'PUBLIC' });
    });
  });
});
