/**
 * Migration: backfill do array `validations` em Field docs existentes.
 *
 * A camada de validacao de campo (`core/validations/*`) adiciona a propriedade
 * `validations: [{ rule, config }]` ao Field. Esta migration garante o default
 * `[]` nos documentos que ainda nao a possuem. Nao sobrescreve valores
 * existentes. O `format` (legado) continua validando — por isso NAO derivamos
 * regras a partir dele (evita validacao dupla); novas regras sao adicionadas
 * pelo usuario via UI.
 *
 * Idempotente via marker no Setting singleton:
 *   - MIGRATION_FIELD_VALIDATIONS_AT
 *
 * Usage:
 *   Dev: node --import @swc-node/register/esm-register database/migrations/migrate-field-validations.ts
 *   Prod: node database/migrations/migrate-field-validations.js
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'Validações de campo';

type SettingMarkerDoc = {
  MIGRATION_FIELD_VALIDATIONS_AT?: Date | null;
};

async function backfillFieldValidations(
  db: mongoose.mongo.Db,
): Promise<{ updated: number; total: number }> {
  const fields = db.collection('fields');
  const total = await fields.countDocuments();

  if (total === 0) return { updated: 0, total: 0 };

  const result = await fields.updateMany(
    { validations: { $exists: false } },
    { $set: { validations: [] } },
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
    { MIGRATION_FIELD_VALIDATIONS_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarkerFieldValidations',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_FIELD_VALIDATIONS_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await backfillFieldValidations(db);
    logger.done(`${result.updated} de ${result.total} campos atualizados`);

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_FIELD_VALIDATIONS_AT: new Date() } },
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
