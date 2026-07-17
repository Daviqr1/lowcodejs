/**
 * Migration: backfill de `label` de string para objeto por contexto.
 *
 * Campos que tinham `label: "algum texto"` (string) passam a ter
 * `label: { list, filter, form, detail }` com o mesmo valor em todos os
 * contextos. Campos com `label: null` permanecem null (nenhum rótulo
 * customizado definido). Documentos que já têm o campo como objeto são
 * ignorados (idempotente).
 *
 * Marker: MIGRATION_FIELD_LABEL_TO_OBJECT_AT
 *
 * Usage:
 *   Dev: node --import @swc-node/register/esm-register database/migrations/24-migrate-field-label-to-object.ts
 *   Prod: node database/migrations/24-migrate-field-label-to-object.js
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'Label de campo: string → objeto por contexto';

type SettingMarkerDoc = {
  MIGRATION_FIELD_LABEL_TO_OBJECT_AT?: Date | null;
};

async function backfillFieldLabel(
  db: mongoose.mongo.Db,
): Promise<{ updated: number; total: number }> {
  const fields = db.collection('fields');
  const total = await fields.countDocuments();

  if (total === 0) return { updated: 0, total: 0 };

  const result = await fields.updateMany({ label: { $type: 'string' } }, [
    {
      $set: {
        label: {
          list: '$label',
          filter: '$label',
          form: '$label',
          detail: '$label',
        },
      },
    },
  ]);

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
    { MIGRATION_FIELD_LABEL_TO_OBJECT_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarkerFieldLabelToObject',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_FIELD_LABEL_TO_OBJECT_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await backfillFieldLabel(db);
    logger.done(`${result.updated} de ${result.total} campos atualizados`);

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_FIELD_LABEL_TO_OBJECT_AT: new Date() } },
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
