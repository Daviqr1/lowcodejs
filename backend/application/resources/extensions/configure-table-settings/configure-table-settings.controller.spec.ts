import bcrypt from 'bcryptjs';
import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  E_EXTENSION_TYPE,
  E_ROLE,
  E_USER_STATUS,
} from '@application/core/entity.core';
import type { IJWTPayload, IRow, ITable } from '@application/core/entity.core';
import type {
  GuardAccessDecision,
  GuardWriteDecision,
  RowAccessGuard,
} from '@application/core/extensions/row-access-guard.contract';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import { Extension } from '@application/model/extension.model';
import { Table } from '@application/model/table.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

// ── Fake guard com settingsSchema ─────────────────────────────────────────────

const fakeSettingsSchema = z.object({
  slidingDays: z.number().int().positive(),
});

const FakeE2EGuard: RowAccessGuard = {
  pluginKey: 'test:e2e-settings-guard',
  category: 'restrictive',
  supportsScopeAll: true,
  settingsSchema: fakeSettingsSchema,

  async onTableBound(_table: ITable, _settings: Record<string, unknown>) {
    const { right } = await import('@application/core/either.core');
    return right({ wasCreated: false });
  },

  adjustListQuery(
    _query: Record<string, unknown>,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _settings: Record<string, unknown>,
  ): Record<string, unknown> {
    return {};
  },

  canRead(
    _row: IRow,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _settings: Record<string, unknown>,
  ): GuardAccessDecision {
    return 'abstain';
  },

  canWrite(
    _row: IRow | null,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _payload: Record<string, unknown> | null,
    _operation: 'create' | 'update' | 'delete',
    _settings: Record<string, unknown>,
  ): GuardWriteDecision {
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
    return payload;
  },
};

// ── Helper: creates a signed-in non-MASTER user ───────────────────────────────

async function createManagerUser(): Promise<{ cookies: string[] }> {
  const password = 'manager123';
  const hashedPassword = await bcrypt.hash(password, 10);

  let group = await UserGroup.findOne({ slug: E_ROLE.MANAGER });
  if (!group) {
    group = await UserGroup.create({
      name: 'Manager',
      slug: E_ROLE.MANAGER,
      permissions: [],
    });
  }

  const user = await User.create({
    name: 'Manager User',
    email: `manager-${Date.now()}@test.com`,
    password: hashedPassword,
    status: E_USER_STATUS.ACTIVE,
    group: group._id,
  });

  const response = await supertest(kernel.server)
    .post('/authentication/sign-in')
    .send({ email: user.email, password });

  const setCookie = response.headers['set-cookie'];
  const cookies: string[] = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];

  return { cookies };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('E2E Extensions configure-table-settings PATCH /:_id/table-settings/:tableId', () => {
  let masterCookies: string[];
  let extensionId: string;
  let tableId: string;

  beforeEach(async () => {
    await kernel.ready();

    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Extension.deleteMany({});
    await Table.deleteMany({});

    // Register fake guard (idempotent across test runs)
    RowAccessGuardService.register(FakeE2EGuard.pluginKey, FakeE2EGuard);

    const master = await createAuthenticatedUser({
      email: `master-settings-${Date.now()}@test.com`,
    });
    masterCookies = master.cookies;

    const table = await Table.create({
      name: 'Docs Settings E2E',
      slug: `docs-settings-e2e-${Date.now()}`,
      owner: master.user._id,
      fields: [],
      _schema: {},
      administrators: [],
      style: 'LIST',
      visibility: 'RESTRICTED',
      collaboration: 'RESTRICTED',
      fieldOrderList: [],
      fieldOrderForm: [],
      type: 'TABLE',
      methods: {
        beforeSave: { code: null },
        afterSave: { code: null },
        onLoad: { code: null },
      },
    });
    tableId = table._id.toString();

    const ext = await Extension.create({
      pkg: 'test',
      type: E_EXTENSION_TYPE.PLUGIN,
      extensionId: 'e2e-settings-guard',
      name: 'E2E Settings Guard',
      description: null,
      version: '1.0.0',
      author: null,
      icon: null,
      image: null,
      slot: null,
      route: null,
      submenu: null,
      enabled: true,
      available: true,
      tableScope: { mode: 'specific', tableIds: [tableId] },
      manifestSnapshot: {},
      requires: {},
      tableSettings: {},
    });
    extensionId = ext._id.toString();
  });

  afterAll(async () => {
    await kernel.close();
  });

  it('MASTER com settings válidos → 200, tableSettings persistido no DB', async () => {
    const getExt = await Extension.findById(extensionId);
    const expectedUpdatedAt = getExt!.updatedAt!.toISOString();

    const response = await supertest(kernel.server)
      .patch(`/extensions/${extensionId}/table-settings/${tableId}`)
      .set('Cookie', masterCookies)
      .send({
        settings: { slidingDays: 30 },
        expectedUpdatedAt,
      });

    expect(response.statusCode).toBe(200);

    const stored = await Extension.findById(extensionId);
    expect(stored?.tableSettings?.[tableId]).toBeDefined();
    expect(stored?.tableSettings?.[tableId]?.slidingDays).toBe(30);
  });

  it('settings inválidos pelo Zod (slidingDays negativo) → 400 ROW_GUARD_SETTINGS_INVALID', async () => {
    const getExt = await Extension.findById(extensionId);
    const expectedUpdatedAt = getExt!.updatedAt!.toISOString();

    const response = await supertest(kernel.server)
      .patch(`/extensions/${extensionId}/table-settings/${tableId}`)
      .set('Cookie', masterCookies)
      .send({
        settings: { slidingDays: -5 },
        expectedUpdatedAt,
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.cause).toBe('ROW_GUARD_SETTINGS_INVALID');
  });

  it('extension não existe → 404 EXTENSION_NOT_FOUND', async () => {
    const response = await supertest(kernel.server)
      .patch(`/extensions/000000000000000000000001/table-settings/${tableId}`)
      .set('Cookie', masterCookies)
      .send({
        settings: { slidingDays: 7 },
        expectedUpdatedAt: new Date().toISOString(),
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.cause).toBe('EXTENSION_NOT_FOUND');
  });

  it('optimistic lock conflict: segundo PATCH com expectedUpdatedAt stale → 409 ROW_GUARD_SETTINGS_CONFLICT', async () => {
    const getExt = await Extension.findById(extensionId);
    const staleUpdatedAt = getExt!.updatedAt!.toISOString();

    // First PATCH succeeds and advances updatedAt
    const first = await supertest(kernel.server)
      .patch(`/extensions/${extensionId}/table-settings/${tableId}`)
      .set('Cookie', masterCookies)
      .send({
        settings: { slidingDays: 10 },
        expectedUpdatedAt: staleUpdatedAt,
      });
    expect(first.statusCode).toBe(200);

    // Second PATCH with the original (now stale) expectedUpdatedAt
    const second = await supertest(kernel.server)
      .patch(`/extensions/${extensionId}/table-settings/${tableId}`)
      .set('Cookie', masterCookies)
      .send({
        settings: { slidingDays: 20 },
        expectedUpdatedAt: staleUpdatedAt,
      });

    expect(second.statusCode).toBe(409);
    expect(second.body.cause).toBe('ROW_GUARD_SETTINGS_CONFLICT');
  });

  it('usuário MANAGER → 403 (rota restrita a MASTER)', async () => {
    const { cookies: managerCookies } = await createManagerUser();

    const getExt = await Extension.findById(extensionId);
    const expectedUpdatedAt = getExt!.updatedAt!.toISOString();

    const response = await supertest(kernel.server)
      .patch(`/extensions/${extensionId}/table-settings/${tableId}`)
      .set('Cookie', managerCookies)
      .send({
        settings: { slidingDays: 7 },
        expectedUpdatedAt,
      });

    expect(response.statusCode).toBe(403);
  });
});
