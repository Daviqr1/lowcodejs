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

import mongoose from 'mongoose';

import {
  reportMigrationFailure,
  runMigration,
} from '../shared/migration-runner';

const TITLE = 'Criação de registros em relacionamentos';

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

runMigration({
  title: TITLE,
  marker: 'MIGRATION_RELATIONSHIP_CREATE_RECORDS_AT',
  async run({ db }): Promise<string> {
    const result = await backfillRelationshipCreateRecords(db);

    return `${result.updated} de ${result.total} campos atualizados`;
  },
}).catch((error: unknown): never => reportMigrationFailure(TITLE, error));
