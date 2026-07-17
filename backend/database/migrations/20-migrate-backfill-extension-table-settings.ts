/**
 * Migration: backfill do campo `tableSettings` em Extension docs existentes.
 *
 * O row-access guard adicionou `tableSettings: Mixed` (default {}) ao Extension
 * model — mapa tableId -> settings da extensão. Mongoose aplica o default apenas
 * em leitura/escrita nova; esta migration persiste `{}` nos docs antigos que
 * ainda não possuem o campo. Não sobrescreve valores existentes.
 *
 * Idempotente via marker no Setting singleton:
 *   - MIGRATION_EXTENSION_TABLE_SETTINGS_AT
 *
 * Usage:
 *   Dev: node --import @swc-node/register/esm-register database/migrations/migrate-backfill-extension-table-settings.ts
 *   Prod: node database/migrations/migrate-backfill-extension-table-settings.js
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'tableSettings das extensões';

type SettingMarkerDoc = {
  MIGRATION_EXTENSION_TABLE_SETTINGS_AT?: Date | null;
};

async function backfillExtensionTableSettings(
  db: mongoose.mongo.Db,
): Promise<{ updated: number; total: number }> {
  const extensions = db.collection('extensions');
  const total = await extensions.countDocuments();

  if (total === 0) return { updated: 0, total: 0 };

  const result = await extensions.updateMany(
    { tableSettings: { $exists: false } },
    { $set: { tableSettings: {} } },
  );

  return { updated: result.modifiedCount, total };
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
    { MIGRATION_EXTENSION_TABLE_SETTINGS_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarkerExtensionTableSettings',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_EXTENSION_TABLE_SETTINGS_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await backfillExtensionTableSettings(db);
    logger.done(`${result.updated} de ${result.total} extensões atualizadas`);

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_EXTENSION_TABLE_SETTINGS_AT: new Date() } },
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
