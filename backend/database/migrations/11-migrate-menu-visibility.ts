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

import mongoose from 'mongoose';

import {
  reportMigrationFailure,
  runMigration,
} from '../shared/migration-runner';

const TITLE = 'Visibilidade dos menus';

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

runMigration({
  title: TITLE,
  marker: 'MIGRATION_MENU_VISIBILITY_AT',
  async run({ db }): Promise<string> {
    const result = await backfillMenuVisibility(db);

    return `${result.updated} de ${result.total} menus atualizados`;
  },
}).catch((error: unknown): never => reportMigrationFailure(TITLE, error));
