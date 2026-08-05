/**
 * Migration: remove os campos legados de permissao dos documentos.
 *
 * Apos os backfills 09 (table-permissions), 10 (field-permissions) e 11
 * (menu-visibility) terem populado o novo modelo, os campos antigos viram dados
 * mortos. Esta migracao faz `$unset` deles:
 *   - tables: `visibility`, `collaboration`, `administrators`
 *   - fields: `showInList`, `showInForm`, `showInDetail`
 *
 * `showInFilter` NAO e removido: nao e permissao, e config da barra de filtros.
 *
 * Seguranca: so remove de documentos que JA possuem o novo modelo
 * (`permissions` presente e nao nulo) — assim, se por algum motivo um documento
 * nao foi migrado, seus campos legados sao preservados ate o backfill rodar.
 *
 * Idempotente via marker no Setting singleton:
 *   - MIGRATION_DROP_LEGACY_PERMISSION_FIELDS_AT
 *
 * Usage:
 *   Dev: node --import @swc-node/register/esm-register database/migrations/migrate-drop-legacy-permission-fields.ts
 *   Prod: node database/migrations/migrate-drop-legacy-permission-fields.js
 */

import mongoose from 'mongoose';

import {
  reportMigrationFailure,
  runMigration,
} from '../shared/migration-runner';

const TITLE = 'Limpeza de campos legados de permissão';

const MIGRATED_FILTER = {
  permissions: { $exists: true, $ne: null },
} as const;

async function dropLegacyFields(
  db: mongoose.mongo.Db,
): Promise<{ tables: number; fields: number }> {
  const tables = db.collection('tables');
  const fields = db.collection('fields');

  const tablesResult = await tables.updateMany(MIGRATED_FILTER, {
    $unset: { visibility: '', collaboration: '', administrators: '' },
  });

  const fieldsResult = await fields.updateMany(MIGRATED_FILTER, {
    $unset: {
      showInList: '',
      showInForm: '',
      showInDetail: '',
    },
  });

  return {
    tables: tablesResult.modifiedCount,
    fields: fieldsResult.modifiedCount,
  };
}

runMigration({
  title: TITLE,
  marker: 'MIGRATION_DROP_LEGACY_PERMISSION_FIELDS_AT',
  async run({ db }): Promise<string> {
    const result = await dropLegacyFields(db);

    return `${result.tables} tabelas e ${result.fields} campos limpos`;
  },
}).catch((error: unknown): never => reportMigrationFailure(TITLE, error));
