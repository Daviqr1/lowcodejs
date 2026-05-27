/**
 * E2E smoke test — Guard combinado: visibility-by-role + creator-bypass + date-window-guard
 *
 * Requer MongoDB rodando (docker compose up -d mongo).
 * Validação de comportamento do composeListQuery com múltiplos guards ativos.
 *
 * Nota: date-window-guard em modo createdAt-sliding filtra rows pelo campo
 * createdAt via query MongoDB. Para simular rows "fora da janela" este teste
 * atualiza createdAt diretamente no DB (acesso direto ao model dinâmico).
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  E_EXTENSION_TYPE,
  E_FIELD_TYPE,
  E_ROLE,
  E_TABLE_COLLABORATION,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  E_TABLE_VISIBILITY,
  E_USER_STATUS,
  E_VISIBILITY,
} from '@application/core/entity.core';
import { buildSchema } from '@application/core/util.core';
import { Extension } from '@application/model/extension.model';
import { Field } from '@application/model/field.model';
import { Permission } from '@application/model/permission.model';
import { Table } from '@application/model/table.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { getDataConnection } from '@config/database.config';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';
import { cleanDynamicCollections } from '@test/helpers/database.helper';

// ── Ensure core guards are registered (idempotent) ───────────────────────────
// Guards are registered at module load time in row-access-guard.service.ts.
// Import here to ensure the side-effects run (registration of all 3 core guards).
import '@application/core/extensions/row-access-guard.service';

// ── Helper: non-MASTER authenticated user ────────────────────────────────────

async function createUserWithRole(
  role: string,
  email: string,
): Promise<{ cookies: string[]; userId: string }> {
  const password = 'test1234';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Reuse permissions created by createAuthenticatedUser (seeded in beforeEach)
  const allPermissions = await Permission.find({});

  let group = await UserGroup.findOne({ slug: role });
  if (!group) {
    group = await UserGroup.create({
      name: role,
      slug: role,
      permissions: allPermissions.map((p) => p._id),
    });
  }

  const user = await User.create({
    name: `User ${role}`,
    email,
    password: hashedPassword,
    status: E_USER_STATUS.ACTIVE,
    group: group._id,
  });

  const response = await supertest(kernel.server)
    .post('/authentication/sign-in')
    .send({ email, password });

  const setCookie = response.headers['set-cookie'];
  const cookies: string[] = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];

  return { cookies, userId: user._id.toString() };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('E2E paginated rows — guard combinado: visibility-by-role + creator-bypass + date-window-guard', () => {
  let TABLE_SLUG: string;
  let masterCookies: string[];
  let masterUserId: string;
  let managerCookies: string[];
  let registeredCookies: string[];

  beforeEach(async () => {
    await kernel.ready();

    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Extension.deleteMany({});
    await Table.deleteMany({});
    await Field.deleteMany({});
    await cleanDynamicCollections();

    TABLE_SLUG = `docs-guard-e2e-${Date.now()}`;

    // ── Create users ──────────────────────────────────────────────────────────
    const masterResult = await createAuthenticatedUser({
      email: `master-guard-${Date.now()}@test.com`,
    });
    masterCookies = masterResult.cookies;
    masterUserId = masterResult.user._id;

    const managerResult = await createUserWithRole(
      E_ROLE.MANAGER,
      `manager-guard-${Date.now()}@test.com`,
    );
    managerCookies = managerResult.cookies;

    const registeredResult = await createUserWithRole(
      E_ROLE.REGISTERED,
      `registered-guard-${Date.now()}@test.com`,
    );
    registeredCookies = registeredResult.cookies;

    // ── Create table with visibility field ────────────────────────────────────
    const visibilityField = await Field.create({
      name: 'Visibilidade',
      slug: 'visibility',
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
      defaultValue: [E_VISIBILITY.PUBLIC],
      relationship: null,
      dropdown: [
        { id: E_VISIBILITY.PUBLIC, label: 'Público', color: '#22c55e' },
        { id: E_VISIBILITY.SIGILOSO, label: 'Sigiloso', color: '#ef4444' },
        { id: 'RESTRITO', label: 'Restrito', color: '#f59e0b' },
      ],
      allowCustomDropdownOptions: false,
      category: [],
      group: null,
    });

    const fieldForSchema = {
      ...visibilityField.toJSON(),
      _id: visibilityField._id.toString(),
    };

    // Native fields required by buildTable schema so creator/trashed are stored properly
    const nativeFieldsForSchema = [
      { slug: 'creator', type: E_FIELD_TYPE.CREATOR, required: false },
      { slug: 'trashed', type: E_FIELD_TYPE.TRASHED, required: false },
      { slug: 'trashedAt', type: E_FIELD_TYPE.TRASHED_AT, required: false },
    ] as any[];

    await Table.create({
      name: 'Docs Guard E2E',
      slug: TABLE_SLUG,
      owner: masterUserId,
      fields: [visibilityField._id.toString()],
      _schema: buildSchema([fieldForSchema, ...nativeFieldsForSchema]),
      administrators: [],
      style: E_TABLE_STYLE.LIST,
      visibility: E_TABLE_VISIBILITY.PUBLIC,
      collaboration: E_TABLE_COLLABORATION.OPEN,
      fieldOrderList: [visibilityField._id.toString()],
      fieldOrderForm: [visibilityField._id.toString()],
      type: E_TABLE_TYPE.TABLE,
      methods: {
        beforeSave: { code: null },
        afterSave: { code: null },
        onLoad: { code: null },
      },
    });

    const table = await Table.findOne({ slug: TABLE_SLUG });
    const tableId = table!._id.toString();

    // ── Register extensions in DB ─────────────────────────────────────────────

    // 1. visibility-by-role (restrictive): restricts to PUBLIC rows
    await Extension.create({
      pkg: 'core',
      type: E_EXTENSION_TYPE.PLUGIN,
      extensionId: 'visibility-by-role',
      name: 'Visibility by Role',
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

    // 2. creator-bypass (permissive): allows creators to see their own rows
    await Extension.create({
      pkg: 'core',
      type: E_EXTENSION_TYPE.PLUGIN,
      extensionId: 'creator-bypass',
      name: 'Creator Bypass',
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

    // 3. date-window-guard (restrictive): createdAt-sliding 30 days
    await Extension.create({
      pkg: 'core',
      type: E_EXTENSION_TYPE.PLUGIN,
      extensionId: 'date-window-guard',
      name: 'Date Window Guard',
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
      tableSettings: {
        [tableId]: { mode: 'createdAt-sliding', slidingDays: 30 },
      },
    });

    // ── Create rows via HTTP (so creator field is set properly) ───────────────

    // MASTER creates: PUBLIC, RESTRITO, SIGILOSO (admin bypass — all allowed)
    await supertest(kernel.server)
      .post(`/tables/${TABLE_SLUG}/rows`)
      .set('Cookie', masterCookies)
      .send({ visibility: [E_VISIBILITY.PUBLIC] });

    await supertest(kernel.server)
      .post(`/tables/${TABLE_SLUG}/rows`)
      .set('Cookie', masterCookies)
      .send({ visibility: ['RESTRITO'] });

    await supertest(kernel.server)
      .post(`/tables/${TABLE_SLUG}/rows`)
      .set('Cookie', masterCookies)
      .send({ visibility: [E_VISIBILITY.SIGILOSO] });

    // MANAGER creates PUBLIC via HTTP (canWrite allows PUBLIC)
    const managerPublicResp = await supertest(kernel.server)
      .post(`/tables/${TABLE_SLUG}/rows`)
      .set('Cookie', managerCookies)
      .send({ visibility: [E_VISIBILITY.PUBLIC] });
    expect(managerPublicResp.statusCode).toBe(201);

    // MANAGER SIGILOSO row must be inserted directly — canWrite blocks SIGILOSO
    // via HTTP for non-admins (correct behavior). Direct insertion tests creator-bypass.
    const conn = getDataConnection();
    const DynModel =
      conn.models[TABLE_SLUG] ??
      conn.model(TABLE_SLUG, new mongoose.Schema({}, { strict: false }), TABLE_SLUG);
    await DynModel.create({
      visibility: [E_VISIBILITY.SIGILOSO],
      creator: new mongoose.Types.ObjectId(managerResult.userId),
      trashed: false,
      trashedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await kernel.close();
  });

  it('MASTER lista → vê todas as 5 rows (admin bypass)', async () => {
    const response = await supertest(kernel.server)
      .get(`/tables/${TABLE_SLUG}/rows/paginated`)
      .set('Cookie', masterCookies);

    expect(response.statusCode).toBe(200);
    expect(response.body.meta.total).toBe(5);
  });

  it('MANAGER lista → vê PUBLIC (master+own) + RESTRITO (master) + própria SIGILOSA (creator-bypass) = 4 rows', async () => {
    const response = await supertest(kernel.server)
      .get(`/tables/${TABLE_SLUG}/rows/paginated`)
      .set('Cookie', managerCookies);

    expect(response.statusCode).toBe(200);
    // PUBLIC from master (1) + RESTRITO from master (1) + PUBLIC from manager (1) + own SIGILOSO via creator-bypass (1) = 4
    // Note: SIGILOSO from master is blocked (not creator + not PUBLIC)
    expect(response.body.meta.total).toBe(4);
  });

  it('REGISTERED lista → vê somente rows PUBLIC (master + manager) = 2 rows', async () => {
    const response = await supertest(kernel.server)
      .get(`/tables/${TABLE_SLUG}/rows/paginated`)
      .set('Cookie', registeredCookies);

    expect(response.statusCode).toBe(200);
    // Only PUBLIC rows: master's PUBLIC + manager's PUBLIC = 2
    expect(response.body.meta.total).toBe(2);
  });

  it('após mover createdAt do PUBLIC do master para 60 dias atrás → MANAGER passa a ver 3 rows', async () => {
    // First, find the master's PUBLIC row in the dynamic collection
    const conn = getDataConnection();
    const DynamicModel =
      conn.models[TABLE_SLUG] ??
      conn.model(TABLE_SLUG, new mongoose.Schema({}, { strict: false }), TABLE_SLUG);

    // Find the PUBLIC row created by master (creator stored as ObjectId, cast from request.user.sub)
    const masterPublicRow = await DynamicModel.findOne({
      creator: new mongoose.Types.ObjectId(masterUserId),
      visibility: E_VISIBILITY.PUBLIC,
    });

    expect(masterPublicRow).toBeDefined();

    // Set createdAt to 60 days ago (outside the 30-day window).
    // Use raw collection to bypass Mongoose timestamps immutability on createdAt.
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
    await DynamicModel.collection.updateOne(
      { _id: masterPublicRow!._id },
      { $set: { createdAt: sixtyDaysAgo } },
    );

    // Now MANAGER should see: RESTRITO from master (1) + PUBLIC from manager (1) + own SIGILOSO via creator-bypass (1) = 3
    // Master's PUBLIC is now outside the date window (60 days > 30 days sliding)
    const response = await supertest(kernel.server)
      .get(`/tables/${TABLE_SLUG}/rows/paginated`)
      .set('Cookie', managerCookies);

    expect(response.statusCode).toBe(200);
    expect(response.body.meta.total).toBe(3);
  });
});
