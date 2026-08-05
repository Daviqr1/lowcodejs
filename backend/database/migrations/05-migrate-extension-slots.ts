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

import mongoose from 'mongoose';

import { runMigration } from '../shared/migration-runner';

const TITLE = 'Renomear slot → slots (extensões)';

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

await runMigration({
  title: TITLE,
  marker: 'MIGRATION_EXTENSION_SLOTS_AT',
  async run({ db }): Promise<string> {
    const result = await renameSlotField(db);

    return `${result.total} extensões — ${result.withSlot} com slot, ${result.withoutSlot} sem`;
  },
});
