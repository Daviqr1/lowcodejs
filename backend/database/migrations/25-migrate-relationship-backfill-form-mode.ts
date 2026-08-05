/**
 * Migration: backfill de formMode='manage' em campos espelho N:N.
 *
 * Campos RELATIONSHIP com multiple=true cujo espelho (mirror.multiple=true)
 * também é múltiplo devem ter formMode='manage' para que o componente
 * RelationshipRowsInline seja renderizado na tabela destino.
 *
 * Marker: MIGRATION_RELATIONSHIP_FORM_MODE_AT
 *
 * Usage:
 *   Dev: node --import @swc-node/register/esm-register database/migrations/25-migrate-relationship-backfill-form-mode.ts
 *   Prod: node database/migrations/25-migrate-relationship-backfill-form-mode.js
 */

import mongoose from 'mongoose';

import { runMigration } from '../shared/migration-runner';

const TITLE = 'Backfill formMode=manage em campos espelho N:N';

async function backfillFormMode(
  db: mongoose.mongo.Db,
): Promise<{ updated: number }> {
  const fields = db.collection('fields');

  const result = await fields.updateMany(
    {
      type: 'RELATIONSHIP',
      multiple: true,
      'relationship.mirror.multiple': true,
      $or: [
        { 'relationship.formMode': { $ne: 'manage' } },
        { 'relationship.formMode': { $exists: false } },
      ],
    },
    { $set: { 'relationship.formMode': 'manage' } },
  );

  return { updated: result.modifiedCount };
}

await runMigration({
  title: TITLE,
  marker: 'MIGRATION_RELATIONSHIP_FORM_MODE_AT',
  async run({ db }): Promise<string> {
    const result = await backfillFormMode(db);

    return `${result.updated} campo(s) espelho N:N atualizados`;
  },
});
