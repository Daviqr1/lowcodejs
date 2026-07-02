/**
 * Migration: introduce row `status`/`draftAt` and drop the row `trashed` boolean.
 *
 * The trash of dynamic rows is now controlled exclusively by `trashedAt`
 * (`trashedAt != null` => in trash). Drafts are tracked by `status` ('draft' |
 * 'published') + `draftAt`. This migration backfills existing dynamic rows (and
 * their embedded FIELD_GROUP items) in the DATA database:
 *
 *   1. status   -> 'published' where missing (legacy rows had no draft concept)
 *   2. draftAt  -> null where missing
 *   3. trashedAt-> null where missing (legacy trashed rows already carry it)
 *   4. $unset the obsolete `trashed` boolean
 *
 * Embedded group items get the same status/draftAt backfill via an aggregation
 * pipeline ($map). Their trash continues to be derived from `trashedAt`.
 *
 * Idempotent via marker in the Setting singleton:
 *   MIGRATION_ROW_STATUS_TRASHED_AT
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/07-migrate-row-status-trashed.ts            # backfill (skips if already done)
 *   node --import @swc-node/register/esm-register database/migrations/07-migrate-row-status-trashed.ts -- --force # re-run, ignoring marker
 *   (no boot Docker roda via scripts/migrations/07-migrate-row-status-trashed.sh)
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name (tables/fields/settings)
 *   DB_DATA_DATABASE - Data database name (dynamic row collections)
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE ?? 'lowcodejs';
const DB_DATA_DATABASE = process.env.DB_DATA_DATABASE ?? 'lowcodejs_data';
const FORCE = process.argv.includes('--force');
const TITLE = 'Status/lixeira das rows';

type SettingMarkerDoc = {
  MIGRATION_ROW_STATUS_TRASHED_AT?: Date | null;
};

type MigrationStats = {
  collectionsProcessed: number;
  rowsUpdated: number;
  groupFieldsBackfilled: number;
};

async function backfillCollection(
  dataDb: mongoose.mongo.Db,
  slug: string,
  groupSlugs: string[],
): Promise<{ rowsUpdated: number; groupFieldsBackfilled: number }> {
  const collection = dataDb.collection(slug);

  const statusResult = await collection.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'published' } },
  );

  await collection.updateMany(
    { draftAt: { $exists: false } },
    { $set: { draftAt: null } },
  );

  await collection.updateMany(
    { trashedAt: { $exists: false } },
    { $set: { trashedAt: null } },
  );

  await collection.updateMany(
    { trashed: { $exists: true } },
    { $unset: { trashed: '' } },
  );

  let groupFieldsBackfilled = 0;

  for (const groupSlug of groupSlugs) {
    // Backfill status/draftAt em cada subitem do array embedded e remove o
    // boolean `trashed` legado. Itens incompletos (que tinham trashed=true)
    // viram 'draft'; os demais 'published'. trashedAt e preservado.
    await collection.updateMany({ [groupSlug]: { $type: 'array' } }, [
      {
        $set: {
          [groupSlug]: {
            $map: {
              input: `$${groupSlug}`,
              as: 'item',
              in: {
                $mergeObjects: [
                  '$$item',
                  {
                    status: {
                      $ifNull: [
                        '$$item.status',
                        {
                          $cond: [
                            { $eq: ['$$item.trashed', true] },
                            'draft',
                            'published',
                          ],
                        },
                      ],
                    },
                    draftAt: { $ifNull: ['$$item.draftAt', null] },
                  },
                ],
              },
            },
          },
        },
      },
    ]);

    groupFieldsBackfilled++;
  }

  return {
    rowsUpdated: statusResult.modifiedCount,
    groupFieldsBackfilled,
  };
}

async function migrate(): Promise<void> {
  const logger = new TaskLogger(TITLE);

  if (!DATABASE_URL) {
    logger.failed('DATABASE_URL não configurada');
    process.exit(1);
  }

  const systemConn = mongoose.createConnection(DATABASE_URL, {
    dbName: DB_DATABASE,
  });
  await systemConn.asPromise();

  const dataConn = mongoose.createConnection(DATABASE_URL, {
    dbName: DB_DATA_DATABASE,
  });
  await dataConn.asPromise();

  const systemDb = systemConn.db!;
  const dataDb = dataConn.db!;

  const SettingMarkerSchema = new mongoose.Schema(
    { MIGRATION_ROW_STATUS_TRASHED_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = systemConn.model<SettingMarkerDoc>(
    'SettingMarkerRowStatusTrashed',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_ROW_STATUS_TRASHED_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();

    const tablesCol = systemDb.collection('tables');
    const fieldsCol = systemDb.collection('fields');

    const tables = await tablesCol.find({}).toArray();

    const stats: MigrationStats = {
      collectionsProcessed: 0,
      rowsUpdated: 0,
      groupFieldsBackfilled: 0,
    };

    for (const table of tables) {
      const slug = table.slug;
      if (typeof slug !== 'string' || slug.length === 0) continue;

      const exists = await dataDb.listCollections({ name: slug }).hasNext();
      if (!exists) continue;

      let fieldIds = [];
      if (Array.isArray(table.fields)) fieldIds = table.fields;
      const groupFields = await fieldsCol
        .find({ _id: { $in: fieldIds }, type: 'FIELD_GROUP' })
        .project({ slug: 1 })
        .toArray();
      const groupSlugs = groupFields
        .map((f) => f.slug)
        .filter((s): s is string => typeof s === 'string');

      const result = await backfillCollection(dataDb, slug, groupSlugs);

      stats.collectionsProcessed++;
      stats.rowsUpdated += result.rowsUpdated;
      stats.groupFieldsBackfilled += result.groupFieldsBackfilled;

      logger.item(
        `${slug} — ${result.rowsUpdated} rows, ${result.groupFieldsBackfilled} grupos`,
      );
    }

    logger.done(
      `${stats.collectionsProcessed} tabelas, ${stats.rowsUpdated} rows, ${stats.groupFieldsBackfilled} grupos`,
    );

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_ROW_STATUS_TRASHED_AT: new Date() } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } finally {
    await systemConn.close();
    await dataConn.close();
  }
}

migrate().catch((error: unknown): void => {
  new TaskLogger(TITLE).failed(error);
  process.exit(1);
});
