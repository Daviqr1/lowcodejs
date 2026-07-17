/**
 * Migration: backfill allowCreateRelationshipRecords on existing Field docs.
 *
 * Idempotent via marker field in the Setting singleton:
 *   - MIGRATION_RELATIONSHIP_CREATE_RECORDS_AT
 *
 * The migration never overwrites existing values. It only sets
 * `allowCreateRelationshipRecords=false` on Field documents where the property
 * does not exist yet.
 *
 * Usage:
 *   The Docker entrypoint runs this migration automatically on container boot.
 *   Development: node --import @swc-node/register/esm-register database/migrations/migrate-backfill-relationship-create-records.ts
 *   Production:  node database/migrations/migrate-backfill-relationship-create-records.js
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
const TITLE = 'Criação de registros em relacionamentos';

type SettingMarkerDoc = {
  MIGRATION_RELATIONSHIP_CREATE_RECORDS_AT?: Date | null;
};

async function backfillRelationshipCreateRecords(
  db: mongoose.mongo.Db,
): Promise<{ updated: number; missing: number; total: number }> {
  const collection = db.collection('fields');
  const total = await collection.countDocuments();

  if (total === 0) return { updated: 0, missing: 0, total: 0 };

  const missing = await collection.countDocuments({
    allowCreateRelationshipRecords: { $exists: false },
  });

  if (missing === 0) return { updated: 0, missing: 0, total };

  const result = await collection.updateMany(
    {
      allowCreateRelationshipRecords: { $exists: false },
    },
    {
      $set: {
        allowCreateRelationshipRecords: false,
      },
    },
  );

  return { updated: result.modifiedCount, missing, total };
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
      MIGRATION_RELATIONSHIP_CREATE_RECORDS_AT: {
        type: Date,
        default: null,
      },
    },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarkerRelationshipCreateRecords',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_RELATIONSHIP_CREATE_RECORDS_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await backfillRelationshipCreateRecords(db);
    logger.done(`${result.updated} de ${result.total} campos atualizados`);

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_RELATIONSHIP_CREATE_RECORDS_AT: new Date() } },
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
