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

import mongoose from 'mongoose';

import { runMigration } from '../shared/migration-runner';

const TITLE = 'Validações de campo';

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

await runMigration({
  title: TITLE,
  marker: 'MIGRATION_FIELD_VALIDATIONS_AT',
  async run({ db }): Promise<string> {
    const result = await backfillFieldValidations(db);

    return `${result.updated} de ${result.total} campos atualizados`;
  },
});
