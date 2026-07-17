/**
 * Migration: backfill de formMode='manage' em campos espelho N:N.
 *
 * Campos RELATIONSHIP com multiple=true cujo espelho (mirror.multiple=true)
 * também é múltiplo devem ter formMode='manage' para que o componente
 * RelationshipRowsInline seja renderizado na tabela destino.
 *
 * Marker: MIGRATION_RELATIONSHIP_FORM_MODE_AT
 *
 * Usage:
 *   Dev: node --import @swc-node/register/esm-register database/migrations/25-migrate-relationship-backfill-form-mode.ts
 *   Prod: node database/migrations/25-migrate-relationship-backfill-form-mode.js
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'Backfill formMode=manage em campos espelho N:N';

type SettingMarkerDoc = {
  MIGRATION_RELATIONSHIP_FORM_MODE_AT?: Date | null;
};

async function backfillFormMode(
  db: mongoose.mongo.Db,
): Promise<{ updated: number }> {
  const fields = db.collection('fields');

  const result = await fields.updateMany(
    {
      type: 'RELATIONSHIP',
      multiple: true,
      'relationship.mirror.multiple': true,
      $or: [
        { 'relationship.formMode': { $ne: 'manage' } },
        { 'relationship.formMode': { $exists: false } },
      ],
    },
    { $set: { 'relationship.formMode': 'manage' } },
  );

  return { updated: result.modifiedCount };
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
    { MIGRATION_RELATIONSHIP_FORM_MODE_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarkerRelationshipFormMode',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_RELATIONSHIP_FORM_MODE_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await backfillFormMode(db);
    logger.done(`${result.updated} campo(s) espelho N:N atualizados`);

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_RELATIONSHIP_FORM_MODE_AT: new Date() } },
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
