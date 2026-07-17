/**
 * Migration: backfill da visibilidade das opções de menu.
 *
 * Define `visibility = { kind: 'PUBLIC', group: null }` em menus que ainda não
 * têm o campo (comportamento legado: menu visível a todos).
 *
 * Idempotente via marker no Setting singleton:
 *   - MIGRATION_MENU_VISIBILITY_AT
 *
 * Usage:
 *   Dev: node --import @swc-node/register/esm-register database/migrations/migrate-menu-visibility.ts
 *   Prod: node database/migrations/migrate-menu-visibility.js
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'Visibilidade dos menus';

type SettingMarkerDoc = {
  MIGRATION_MENU_VISIBILITY_AT?: Date | null;
};

async function backfillMenuVisibility(
  db: mongoose.mongo.Db,
): Promise<{ updated: number; total: number }> {
  const menus = db.collection('menus');
  const total = await menus.countDocuments();

  if (total === 0) return { updated: 0, total: 0 };

  const result = await menus.updateMany(
    { $or: [{ visibility: { $exists: false } }, { visibility: null }] },
    { $set: { visibility: { kind: 'PUBLIC', group: null } } },
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
    { MIGRATION_MENU_VISIBILITY_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarkerMenuVisibility',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_MENU_VISIBILITY_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await backfillMenuVisibility(db);
    logger.done(`${result.updated} de ${result.total} menus atualizados`);

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_MENU_VISIBILITY_AT: new Date() } },
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
