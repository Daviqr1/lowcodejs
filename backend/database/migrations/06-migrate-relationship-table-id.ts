/**
 * Migration: backfill relationship.table._id in Field documents.
 *
 * Idempotent via marker field in the Setting singleton:
 *   - MIGRATION_RELATIONSHIP_TABLE_ID_AT (set after backfill completes)
 *
 * Safe to run on every container boot — second run is a no-op (single findOne).
 *
 * Finds all Field documents with type=RELATIONSHIP where relationship.table._id
 * is null or missing, looks up the Table by relationship.table.slug, and
 * backfills the _id. This makes relationship references slug-independent.
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/06-migrate-relationship-table-id.ts            # backfill (skips if already done)
 *   node --import @swc-node/register/esm-register database/migrations/06-migrate-relationship-table-id.ts -- --force # re-run ignoring marker
 *   (no boot Docker roda via scripts/migrations/06-migrate-relationship-table-id.sh)
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
const DB_DATABASE = process.env.DB_DATABASE ?? 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'ID de tabela em relacionamentos';

type SettingMarkerDoc = {
  MIGRATION_RELATIONSHIP_TABLE_ID_AT?: Date | null;
};

type FieldMigrationDoc = {
  _id: mongoose.Types.ObjectId;
  relationship?: {
    table?: {
      _id?: mongoose.Types.ObjectId | null;
      slug?: string;
    };
  };
};

type TableMigrationDoc = {
  _id: mongoose.Types.ObjectId;
  slug: string;
};

const FieldSchema = new mongoose.Schema(
  {
    type: { type: String },
    relationship: {
      table: {
        _id: { type: mongoose.Schema.Types.ObjectId, default: null },
        slug: { type: String, default: null },
      },
    },
  },
  { strict: false, collection: 'fields' },
);

const TableSchema = new mongoose.Schema(
  {
    slug: { type: String },
  },
  { strict: false, collection: 'tables' },
);

const SettingMarkerSchema = new mongoose.Schema(
  { MIGRATION_RELATIONSHIP_TABLE_ID_AT: { type: Date, default: null } },
  { strict: false, collection: 'settings' },
);

async function backfillRelationshipTableId(
  FieldModel: mongoose.Model<FieldMigrationDoc>,
  TableModel: mongoose.Model<TableMigrationDoc>,
  logger: TaskLogger,
): Promise<{ updated: number; skipped: number }> {
  const fields = await FieldModel.find({
    type: 'RELATIONSHIP',
    $or: [
      { 'relationship.table._id': { $exists: false } },
      { 'relationship.table._id': null },
    ],
  }).lean();

  if (fields.length === 0) return { updated: 0, skipped: 0 };

  let updated = 0;
  let skipped = 0;

  for (const field of fields) {
    const slug = field.relationship?.table?.slug;

    if (!slug) {
      logger.item(`campo ${field._id.toString()} — sem slug de tabela, pulado`);
      skipped++;
      continue;
    }

    const table = await TableModel.findOne({ slug }).lean();

    if (!table) {
      logger.item(`${slug} — tabela não encontrada, pulado`);
      skipped++;
      continue;
    }

    await FieldModel.updateOne(
      { _id: field._id },
      { $set: { 'relationship.table._id': table._id } },
    );
    updated++;
    logger.item(`${slug} — vínculo atualizado`);
  }

  return { updated, skipped };
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

  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarkerRelTableId',
    SettingMarkerSchema,
  );
  const FieldModel = conn.model<FieldMigrationDoc>(
    'MigrationField',
    FieldSchema,
  );
  const TableModel = conn.model<TableMigrationDoc>(
    'MigrationTable',
    TableSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_RELATIONSHIP_TABLE_ID_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await backfillRelationshipTableId(
      FieldModel,
      TableModel,
      logger,
    );
    logger.done(`${result.updated} atualizados, ${result.skipped} pulados`);

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_RELATIONSHIP_TABLE_ID_AT: new Date() } },
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
