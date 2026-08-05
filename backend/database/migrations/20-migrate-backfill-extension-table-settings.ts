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

import mongoose from 'mongoose';

import {
  reportMigrationFailure,
  runMigration,
} from '../shared/migration-runner';

const TITLE = 'tableSettings das extensões';

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

runMigration({
  title: TITLE,
  marker: 'MIGRATION_EXTENSION_TABLE_SETTINGS_AT',
  async run({ db }): Promise<string> {
    const result = await backfillExtensionTableSettings(db);

    return `${result.updated} de ${result.total} extensões atualizadas`;
  },
}).catch((error: unknown): never => reportMigrationFailure(TITLE, error));
