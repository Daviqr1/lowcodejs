/**
 * Migration: backfill do novo modelo de permissoes da tabela.
 *
 * Para cada tabela ainda sem o mapa `permissions`, deriva:
 *   - `permissions`: binding por acao (Grupo|Public|Nobody) a partir da
 *     `visibility` legada, seguindo a matriz "Colaboracao" da especificacao.
 *   - `members`: o `owner` vira membro OWNER e cada `administrators` vira ADMIN.
 *
 * "Usuario logado / todos os grupos" e mapeado para o grupo Registered (todos os
 * usuarios logados o satisfazem via hierarquia). "Visitante" vira PUBLIC. As
 * demais acoes ficam NOBODY (apenas dono e convidados, que tem acesso pelos
 * proprios perfis).
 *
 * Idempotente via marker no Setting singleton:
 *   - MIGRATION_TABLE_PERMISSIONS_AT
 *
 * Nao remove os campos legados (visibility/collaboration/administrators).
 *
 * Usage:
 *   Dev: node --import @swc-node/register/esm-register database/migrations/migrate-table-permissions.ts
 *   Prod: node database/migrations/migrate-table-permissions.js
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'Permissões de tabela';

type SettingMarkerDoc = {
  MIGRATION_TABLE_PERMISSIONS_AT?: Date | null;
};

type Binding = { kind: string; group: mongoose.Types.ObjectId | null };

const TABLE_ACTIONS = [
  'VIEW_TABLE',
  'UPDATE_TABLE',
  'CREATE_FIELD',
  'UPDATE_FIELD',
  'REMOVE_FIELD',
  'VIEW_FIELD',
  'CREATE_ROW',
  'UPDATE_ROW',
  'REMOVE_ROW',
  'VIEW_ROW',
];

function buildPermissions(
  visibility: string | undefined,
  registeredId: mongoose.Types.ObjectId | null,
): Record<string, Binding> {
  const nobody = (): Binding => ({ kind: 'NOBODY', group: null });
  const publicAll = (): Binding => ({ kind: 'PUBLIC', group: null });
  const registered = (): Binding => ({ kind: 'GROUP', group: registeredId });

  const permissions: Record<string, Binding> = {};
  for (const action of TABLE_ACTIONS) {
    permissions[action] = nobody();
  }

  if (visibility === 'RESTRICTED') {
    permissions.VIEW_TABLE = registered();
    permissions.VIEW_ROW = registered();
  }

  if (visibility === 'OPEN') {
    permissions.VIEW_TABLE = registered();
    permissions.VIEW_ROW = registered();
    permissions.CREATE_ROW = registered();
  }

  if (visibility === 'PUBLIC') {
    permissions.VIEW_TABLE = publicAll();
    permissions.VIEW_ROW = publicAll();
    permissions.CREATE_ROW = registered();
  }

  if (visibility === 'FORM') {
    permissions.CREATE_ROW = publicAll();
  }

  // PRIVATE (e qualquer outro) -> tudo NOBODY (somente dono e convidados).
  return permissions;
}

function buildMembers(
  owner: mongoose.Types.ObjectId | null,
  administrators: mongoose.Types.ObjectId[],
): Array<{ user: mongoose.Types.ObjectId; profile: string }> {
  const members: Array<{ user: mongoose.Types.ObjectId; profile: string }> = [];

  if (owner) {
    members.push({ user: owner, profile: 'OWNER' });
  }

  for (const admin of administrators ?? []) {
    if (!admin) continue;
    if (owner && admin.toString() === owner.toString()) continue;
    members.push({ user: admin, profile: 'ADMIN' });
  }

  return members;
}

async function backfillTablePermissions(
  db: mongoose.mongo.Db,
  logger: TaskLogger,
): Promise<{ updated: number; total: number }> {
  const tables = db.collection('tables');
  const total = await tables.countDocuments();

  if (total === 0) return { updated: 0, total: 0 };

  const groups = db.collection('user-groups');
  const registered = await groups.findOne({ slug: 'REGISTERED' });
  const registeredId = registered?._id ?? null;

  if (!registeredId) {
    logger.item(
      'grupo Registered não encontrado — ações de usuário logado caem para NOBODY',
    );
  }

  const cursor = tables.find({
    $or: [{ permissions: { $exists: false } }, { permissions: null }],
  });

  let updated = 0;
  for await (const table of cursor) {
    const permissions = buildPermissions(table.visibility, registeredId);
    const members = buildMembers(table.owner, table.administrators ?? []);

    await tables.updateOne(
      { _id: table._id },
      { $set: { permissions, members } },
    );
    updated += 1;
  }

  return { updated, total };
}

async function migrate(): Promise<void> {
  const logger = new TaskLogger(TITLE);

  if (!DATABASE_URL) {
    logger.failed('DATABASE_URL não configurada');
    process.exit(1);
  }

  const conn = mongoose.createConnection(DATABASE_URL, { dbName: DB_DATABASE });
  await conn.asPromise();

  const db = conn.db!;

  const SettingMarkerSchema = new mongoose.Schema(
    { MIGRATION_TABLE_PERMISSIONS_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarkerTablePermissions',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_TABLE_PERMISSIONS_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await backfillTablePermissions(db, logger);
    logger.done(`${result.updated} de ${result.total} tabelas atualizadas`);

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_TABLE_PERMISSIONS_AT: new Date() } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } finally {
    await conn.close();
  }
}

migrate().catch((error: unknown): void => {
  new TaskLogger(TITLE).failed(error);
  process.exit(1);
});
