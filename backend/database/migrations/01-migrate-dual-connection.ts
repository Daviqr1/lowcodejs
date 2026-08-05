/**
 * Migration: Move dynamic collections from system DB to data DB.
 *
 * Idempotent via marker fields in the Setting singleton:
 *   - MIGRATION_DUAL_CONNECTION_AT          (set after copy completes)
 *   - MIGRATION_DUAL_CONNECTION_DROPPED_AT  (set after --drop-source completes)
 *
 * Safe to run on every container boot — second run is a no-op (single findOne).
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/01-migrate-dual-connection.ts                 # copy (skips if already migrated)
 *   node --import @swc-node/register/esm-register database/migrations/01-migrate-dual-connection.ts -- --force       # copy again, ignoring marker
 *   node --import @swc-node/register/esm-register database/migrations/01-migrate-dual-connection.ts -- --drop-source # drop source collections (requires prior migration)
 *   (no boot Docker roda via scripts/migrations/01-migrate-dual-connection.sh)
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name (source)
 *   DB_DATA_DATABASE - Data database name (target)
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import type { Merge } from '@application/core/entity.core';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const DB_DATA_DATABASE = process.env.DB_DATA_DATABASE || 'lowcodejs_data';
const DROP_SOURCE = process.argv.includes('--drop-source');
const FORCE = process.argv.includes('--force');
const TITLE = 'Cópia de dados (system → data)';

type SettingMarkerDoc = {
  MIGRATION_DUAL_CONNECTION_AT?: Date | null;
  MIGRATION_DUAL_CONNECTION_DROPPED_AT?: Date | null;
};

function isMongoDuplicateKeyError(
  e: unknown,
): e is Merge<Error, { code: number }> {
  return e instanceof Error && 'code' in e;
}

async function copyCollections(
  sourceDb: mongoose.mongo.Db,
  targetDb: mongoose.mongo.Db,
  logger: TaskLogger,
): Promise<{ migrated: number; skipped: number; total: number }> {
  const tables = await sourceDb
    .collection('tables')
    .find({ trashed: { $ne: true } })
    .project({ slug: 1 })
    .toArray();

  if (tables.length === 0) return { migrated: 0, skipped: 0, total: 0 };

  let migrated = 0;
  let skipped = 0;

  for (const table of tables) {
    const slug = table.slug;
    if (!slug) {
      skipped++;
      continue;
    }

    const sourceCollections = await sourceDb
      .listCollections({ name: slug })
      .toArray();

    if (sourceCollections.length === 0) {
      logger.item(`${slug} — sem collection na origem, pulada`);
      skipped++;
      continue;
    }

    const sourceCol = sourceDb.collection(slug);
    const count = await sourceCol.countDocuments();

    if (count === 0) {
      logger.item(`${slug} — collection vazia, pulada`);
      skipped++;
      continue;
    }

    const docs = await sourceCol.find().toArray();
    const targetCol = targetDb.collection(slug);

    try {
      await targetCol.insertMany(docs, { ordered: false });
    } catch (error: unknown) {
      if (isMongoDuplicateKeyError(error) && error.code === 11000) {
        logger.item(`${slug} — duplicatas ignoradas (${count} docs)`);
      } else {
        logger.item(`${slug} — erro: ${String(error)}`);
        continue;
      }
    }

    logger.item(`${slug} — ${count} documentos copiados`);
    migrated++;
  }

  return { migrated, skipped, total: tables.length };
}

async function dropSourceCollections(
  sourceDb: mongoose.mongo.Db,
  logger: TaskLogger,
): Promise<{ dropped: number; skipped: number; total: number }> {
  const tables = await sourceDb
    .collection('tables')
    .find({ trashed: { $ne: true } })
    .project({ slug: 1 })
    .toArray();

  let dropped = 0;
  let skipped = 0;

  for (const table of tables) {
    const slug = table.slug;
    if (!slug) {
      skipped++;
      continue;
    }

    const sourceCollections = await sourceDb
      .listCollections({ name: slug })
      .toArray();

    if (sourceCollections.length === 0) {
      logger.item(`${slug} — sem collection na origem, pulada`);
      skipped++;
      continue;
    }

    await sourceDb.dropCollection(slug);
    logger.item(`${slug} — removida da origem`);
    dropped++;
  }

  return { dropped, skipped, total: tables.length };
}

async function migrate(): Promise<void> {
  const logger = new TaskLogger(TITLE);

  if (!DATABASE_URL) {
    logger.failed('DATABASE_URL não configurada');
    process.exit(1);
  }

  const sourceConn = mongoose.createConnection(DATABASE_URL, {
    dbName: DB_DATABASE,
  });
  await sourceConn.asPromise();

  const targetConn = mongoose.createConnection(DATABASE_URL, {
    dbName: DB_DATA_DATABASE,
  });
  await targetConn.asPromise();

  const sourceDb = sourceConn.db!;
  const targetDb = targetConn.db!;

  // Local Setting schema (strict:false so we don't need to mirror all 28 fields).
  // Only the migration markers matter here.
  const SettingMarkerSchema = new mongoose.Schema(
    {
      MIGRATION_DUAL_CONNECTION_AT: { type: Date, default: null },
      MIGRATION_DUAL_CONNECTION_DROPPED_AT: { type: Date, default: null },
    },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = sourceConn.model<SettingMarkerDoc>(
    'SettingMarker',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    if (DROP_SOURCE) {
      if (!setting?.MIGRATION_DUAL_CONNECTION_AT) {
        logger.failed(
          'cópia ainda não registrada — rode `sh scripts/migrations/01-migrate-dual-connection.sh` antes do drop',
        );
        process.exit(1);
      }

      const droppedAt = setting?.MIGRATION_DUAL_CONNECTION_DROPPED_AT;
      if (droppedAt && !FORCE) {
        logger.skipped(droppedAt);
        return;
      }

      logger.running();
      const result = await dropSourceCollections(sourceDb, logger);
      logger.done(
        `${result.dropped} removidas, ${result.skipped} puladas (${result.total} no total)`,
      );

      await SettingMarker.findOneAndUpdate(
        {},
        { $set: { MIGRATION_DUAL_CONNECTION_DROPPED_AT: new Date() } },
        { upsert: true, setDefaultsOnInsert: true },
      );
      return;
    }

    const appliedAt = setting?.MIGRATION_DUAL_CONNECTION_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await copyCollections(sourceDb, targetDb, logger);
    logger.done(
      `${result.migrated} copiadas, ${result.skipped} puladas (${result.total} no total)`,
    );

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_DUAL_CONNECTION_AT: new Date() } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } finally {
    await sourceConn.close();
    await targetConn.close();
  }
}

try {
  await migrate();
} catch (error) {
  new TaskLogger(TITLE).failed(error);
  process.exit(1);
}
