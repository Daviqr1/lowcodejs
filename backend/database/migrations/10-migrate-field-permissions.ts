/**
 * Migration: backfill da visibilidade de campo por contexto.
 *
 * Para cada campo ainda sem o mapa `permissions`, deriva `list`/`form`/`detail`
 * dos booleans legados showIn*: true -> PUBLIC (visível a todos), false ->
 * NOBODY (oculto). Mantém os booleans showIn* intactos.
 *
 * Idempotente via marker no Setting singleton:
 *   - MIGRATION_FIELD_PERMISSIONS_AT
 *
 * Usage:
 *   Dev: node --import @swc-node/register/esm-register database/migrations/migrate-field-permissions.ts
 *   Prod: node database/migrations/migrate-field-permissions.js
 */

import mongoose from 'mongoose';

import {
  reportMigrationFailure,
  runMigration,
} from '../shared/migration-runner';

const TITLE = 'Permissões de campo';

function binding(visible: boolean): { kind: string; group: null } {
  if (visible) return { kind: 'PUBLIC', group: null };
  return { kind: 'NOBODY', group: null };
}

async function backfillFieldPermissions(
  db: mongoose.mongo.Db,
): Promise<{ updated: number; total: number }> {
  const fields = db.collection('fields');
  const total = await fields.countDocuments();

  if (total === 0) return { updated: 0, total: 0 };

  const cursor = fields.find({
    $or: [{ permissions: { $exists: false } }, { permissions: null }],
  });

  let updated = 0;
  for await (const field of cursor) {
    const permissions = {
      list: binding(Boolean(field.showInList)),
      form: binding(Boolean(field.showInForm)),
      detail: binding(Boolean(field.showInDetail)),
    };

    await fields.updateOne({ _id: field._id }, { $set: { permissions } });
    updated += 1;
  }

  return { updated, total };
}

runMigration({
  title: TITLE,
  marker: 'MIGRATION_FIELD_PERMISSIONS_AT',
  async run({ db }): Promise<string> {
    const result = await backfillFieldPermissions(db);

    return `${result.updated} de ${result.total} campos atualizados`;
  },
}).catch((error: unknown): never => reportMigrationFailure(TITLE, error));
