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

import mongoose from 'mongoose';

import {
  reportMigrationFailure,
  runMigration,
} from '../shared/migration-runner';

const TITLE = 'Status/lixeira das rows';

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

runMigration({
  title: TITLE,
  marker: 'MIGRATION_ROW_STATUS_TRASHED_AT',
  withDataConnection: true,
  async run({ db, dataDb: rawDataDb, logger }): Promise<string> {
    const systemDb = db;
    const dataDb = rawDataDb!;

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

    return `${stats.collectionsProcessed} tabelas, ${stats.rowsUpdated} rows, ${stats.groupFieldsBackfilled} grupos`;
  },
}).catch((error: unknown): never => reportMigrationFailure(TITLE, error));
