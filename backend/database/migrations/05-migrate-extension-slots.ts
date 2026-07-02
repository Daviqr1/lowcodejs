/**
 * Migration: rename `slot: string | null` -> `slots: string[]` em todos os
 * documentos da collection `extensions`.
 *
 * Idempotente via marker no Setting singleton:
 *   - MIGRATION_EXTENSION_SLOTS_AT (set após renomear)
 *
 * Comportamento:
 *   - Se `slot` é string não vazia → `slots = [slot]`
 *   - Se `slot` é null/ausente → `slots = []`
 *   - Remove o campo `slot` em todos os casos
 *
 * Safe to run on every container boot — segunda execução é no-op.
 *
 * Uso:
 *   node --import @swc-node/register/esm-register database/migrations/05-migrate-extension-slots.ts            # roda (skip se já migrado)
 *   node --import @swc-node/register/esm-register database/migrations/05-migrate-extension-slots.ts -- --force # re-executa ignorando marker
 *   (no boot Docker roda via scripts/migrations/05-migrate-extension-slots.sh)
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'Renomear slot → slots (extensões)';

type SettingMarkerDoc = {
  MIGRATION_EXTENSION_SLOTS_AT?: Date | null;
};

async function renameSlotField(
  db: mongoose.mongo.Db,
): Promise<{ withSlot: number; withoutSlot: number; total: number }> {
  const collection = db.collection('extensions');
  const total = await collection.countDocuments();

  if (total === 0) return { withSlot: 0, withoutSlot: 0, total: 0 };

  // 1) slot string → slots = [slot] (e remove slot)
  const cursorWithString = collection.find({
    slot: { $type: 'string', $ne: '' },
  });
  let withSlot = 0;
  for await (const doc of cursorWithString) {
    await collection.updateOne(
      { _id: doc._id },
      {
        $set: { slots: [doc.slot] },
        $unset: { slot: '' },
      },
    );
    withSlot += 1;
  }

  // 2) slot null/ausente/vazio → slots = [] (e remove slot)
  const resultRest = await collection.updateMany(
    {
      $or: [
        { slot: null },
        { slot: '' },
        { slot: { $exists: false }, slots: { $exists: false } },
      ],
    },
    {
      $set: { slots: [] },
      $unset: { slot: '' },
    },
  );

  return {
    withSlot,
    withoutSlot: resultRest.modifiedCount,
    total,
  };
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

  const db = conn.db!;

  const SettingMarkerSchema = new mongoose.Schema(
    {
      MIGRATION_EXTENSION_SLOTS_AT: { type: Date, default: null },
    },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarkerExtensionSlots',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_EXTENSION_SLOTS_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await renameSlotField(db);
    logger.done(
      `${result.total} extensões — ${result.withSlot} com slot, ${result.withoutSlot} sem`,
    );

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_EXTENSION_SLOTS_AT: new Date() } },
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
