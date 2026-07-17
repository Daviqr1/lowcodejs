/**
 * Migration: backfill da visibilidade de campo por contexto.
 *
 * Para cada campo ainda sem o mapa `permissions`, deriva `list`/`form`/`detail`
 * dos booleans legados showIn*: true -> PUBLIC (visível a todos), false ->
 * NOBODY (oculto). Mantém os booleans showIn* intactos.
 *
 * Idempotente via marker no Setting singleton:
 *   - MIGRATION_FIELD_PERMISSIONS_AT
 *
 * Usage:
 *   Dev: node --import @swc-node/register/esm-register database/migrations/migrate-field-permissions.ts
 *   Prod: node database/migrations/migrate-field-permissions.js
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'Permissões de campo';

type SettingMarkerDoc = {
  MIGRATION_FIELD_PERMISSIONS_AT?: Date | null;
};

function binding(visible: boolean): { kind: string; group: null } {
  if (visible) return { kind: 'PUBLIC', group: null };
  return { kind: 'NOBODY', group: null };
}

async function backfillFieldPermissions(
  db: mongoose.mongo.Db,
): Promise<{ updated: number; total: number }> {
  const fields = db.collection('fields');
  const total = await fields.countDocuments();

  if (total === 0) return { updated: 0, total: 0 };

  const cursor = fields.find({
    $or: [{ permissions: { $exists: false } }, { permissions: null }],
  });

  let updated = 0;
  for await (const field of cursor) {
    const permissions = {
      list: binding(Boolean(field.showInList)),
      form: binding(Boolean(field.showInForm)),
      detail: binding(Boolean(field.showInDetail)),
    };

    await fields.updateOne({ _id: field._id }, { $set: { permissions } });
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
    { MIGRATION_FIELD_PERMISSIONS_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarkerFieldPermissions',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_FIELD_PERMISSIONS_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await backfillFieldPermissions(db);
    logger.done(`${result.updated} de ${result.total} campos atualizados`);

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_FIELD_PERMISSIONS_AT: new Date() } },
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
