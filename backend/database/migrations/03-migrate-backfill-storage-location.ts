/**
 * Migration: backfill storage.location field on existing Storage docs.
 *
 * Idempotent via marker field in the Setting singleton:
 *   - MIGRATION_STORAGE_LOCATION_AT (set after backfill completes)
 *
 * Safe to run on every container boot — second run is a no-op (single findOne).
 *
 * Populates `location` and `migration_status` on every Storage doc that lacks
 * them. The active driver is read directly from the Setting singleton in the
 * database (NOT from process.env), since this migration runs before the server
 * boot (and therefore before syncStorageEnv).
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/03-migrate-backfill-storage-location.ts            # backfill (skips if already done)
 *   node --import @swc-node/register/esm-register database/migrations/03-migrate-backfill-storage-location.ts -- --force # re-run ignoring marker
 *   (wrapper .sh 03 está desativado — o backfill roda pela feature de storage-migration)
 *
 * Environment variables required:
 *   DATABASE_URL - MongoDB connection string
 *   DB_DATABASE  - System database name
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'Local dos arquivos (storage)';

type SettingMarkerDoc = {
  STORAGE_DRIVER?: 'local' | 's3' | null;
  MIGRATION_STORAGE_LOCATION_AT?: Date | null;
};

async function backfillStorageLocation(
  db: mongoose.mongo.Db,
  driver: 'local' | 's3',
): Promise<{ updated: number; total: number }> {
  const collection = db.collection('storage');
  const total = await collection.countDocuments();

  if (total === 0) return { updated: 0, total: 0 };

  const result = await collection.updateMany(
    {
      $or: [
        { location: { $exists: false } },
        { migration_status: { $exists: false } },
      ],
    },
    {
      $set: {
        location: driver,
        migration_status: 'idle',
      },
    },
  );

  return { updated: result.modifiedCount, total };
}

async function migrate(): Promise<void> {
  const logger = new TaskLogger(TITLE);

  if (!DATABASE_URL) {
    logger.failed('DATABASE_URL não configurada');
    process.exit(1);
  }

  const conn = mongoose.createConnection(DATABASE_URL, {
    dbName: DB_DATABASE,
  });
  await conn.asPromise();

  const db = conn.db!;

  const SettingMarkerSchema = new mongoose.Schema(
    {
      STORAGE_DRIVER: { type: String, default: null },
      MIGRATION_STORAGE_LOCATION_AT: { type: Date, default: null },
    },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarkerStorageLocation',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();
  const driver: 'local' | 's3' = setting?.STORAGE_DRIVER ?? 'local';

  try {
    const appliedAt = setting?.MIGRATION_STORAGE_LOCATION_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await backfillStorageLocation(db, driver);
    logger.done(
      `${result.updated} de ${result.total} arquivos marcados (driver ${driver})`,
    );

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_STORAGE_LOCATION_AT: new Date() } },
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
