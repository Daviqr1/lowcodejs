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

import mongoose from 'mongoose';

import {
  reportMigrationFailure,
  runMigration,
} from '../shared/migration-runner';

const TITLE = 'Label de campo: string → objeto por contexto';

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

runMigration({
  title: TITLE,
  marker: 'MIGRATION_FIELD_LABEL_TO_OBJECT_AT',
  async run({ db }): Promise<string> {
    const result = await backfillFieldLabel(db);

    return `${result.updated} de ${result.total} campos atualizados`;
  },
}).catch((error: unknown): never => reportMigrationFailure(TITLE, error));
