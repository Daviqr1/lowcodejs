/**
 * Migration: backfill `sharedRowSlug` em rows dinâmicas existentes.
 *
 * O link amigável do registro (`/tables/:slug/:rowSlug`) é resolvido no backend
 * por busca estrita em `{ sharedRowSlug }` (sem slugify dinâmico em tempo de
 * leitura). Logo, registros criados ANTES de a tabela ter `rowSlugFieldId`
 * configurado ficam com `sharedRowSlug` nulo e a URL amigável retorna 404.
 *
 * Esta migration percorre TODAS as tabelas e gera o `sharedRowSlug` dos registros
 * que ainda não têm, a partir do valor do campo de slug — usando o MESMO algoritmo
 * do create/update de row (`FieldSlug`). Para tabelas SEM `rowSlugFieldId` (tabelas
 * antigas), faz fallback: pega o primeiro campo TEXT_SHORT ativo, PERSISTE-o em
 * `table.rowSlugFieldId` (para registros novos também ganharem slug no runtime) e
 * usa-o como fonte do backfill.
 *
 * Idempotente: só preenche o que falta (nunca sobrescreve slug existente nem
 * rowSlugFieldId já setado, pula registros na lixeira e registros sem valor no
 * campo). Markers no Setting evitam o full-scan em todo boot:
 *   MIGRATION_ROW_SLUG_BACKFILL_AT
 *   MIGRATION_ROW_SLUG_BACKFILL_FALLBACK_AT   (re-roda 1x aplicando o fallback)
 *   MIGRATION_ROW_SLUG_BACKFILL_UNIVERSAL_AT  (re-roda 1x re-aplicando o backfill
 *                                             universal após o heal por estilo ter
 *                                             removido slugs de DOCUMENT/FORUM/etc.)
 *
 * Re-rodar é seguro e necessário quando um MASTER ativa o campo de slug numa
 * tabela JÁ populada depois do primeiro backfill — use `--force`.
 *
 * Usage:
 *   node ... migrate-backfill-row-slugs.ts            # backfill (skip se marker setado)
 *   node ... migrate-backfill-row-slugs.ts --force    # re-roda ignorando o marker
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name (tables/fields/settings)
 *   DB_DATA_DATABASE - Data database name (dynamic row collections)
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { E_FIELD_TYPE } from '../../application/core/entity.core';
import { FieldSlug } from '../../application/core/field-slug.core';
import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE ?? 'lowcodejs';
const DB_DATA_DATABASE = process.env.DB_DATA_DATABASE ?? 'lowcodejs_data';
const FORCE = process.argv.includes('--force');
const TITLE = 'Slugs amigáveis das rows';

type SettingMarkerDoc = {
  MIGRATION_ROW_SLUG_BACKFILL_AT?: Date | null;
  MIGRATION_ROW_SLUG_BACKFILL_FALLBACK_AT?: Date | null;
  MIGRATION_ROW_SLUG_BACKFILL_UNIVERSAL_AT?: Date | null;
};

type MigrationStats = {
  tablesProcessed: number;
  rowsUpdated: number;
  fieldsAssigned: number;
};

// Resolve a chave da coluna usada como fonte do slug numa tabela. Quando a tabela
// já tem rowSlugFieldId configurado, usa esse campo. Senão (tabela antiga), pega o
// primeiro campo TEXT_SHORT ativo na ordem de table.fields, PERSISTE esse campo em
// table.rowSlugFieldId (para rows novas também ganharem slug no runtime) e retorna
// seu slug. Retorna null quando não há campo de slug aplicável.
async function resolveSlugFieldKey(
  tablesCol: mongoose.mongo.Collection,
  fieldsCol: mongoose.mongo.Collection,
  table: mongoose.mongo.Document,
): Promise<{ fieldSlug: string; assigned: boolean } | null> {
  if (table.rowSlugFieldId) {
    const field = await fieldsCol.findOne({ _id: table.rowSlugFieldId });
    const fieldSlug = field?.slug;
    if (typeof fieldSlug !== 'string' || fieldSlug.length === 0) return null;
    return { fieldSlug, assigned: false };
  }

  let fieldIds = [];
  if (Array.isArray(table.fields)) fieldIds = table.fields;
  if (fieldIds.length === 0) return null;

  const fields = await fieldsCol.find({ _id: { $in: fieldIds } }).toArray();
  const byId = new Map(fields.map((field) => [String(field._id), field]));

  for (const fieldId of fieldIds) {
    const field = byId.get(String(fieldId));
    if (!field) continue;
    if (field.type !== E_FIELD_TYPE.TEXT_SHORT) continue;
    if (field.trashed === true) continue;

    const fieldSlug = field.slug;
    if (typeof fieldSlug !== 'string' || fieldSlug.length === 0) continue;

    await tablesCol.updateOne(
      { _id: table._id },
      { $set: { rowSlugFieldId: field._id } },
    );

    return { fieldSlug, assigned: true };
  }

  return null;
}

// Preenche sharedRowSlug numa única collection de dados. Retorna quantas rows
// foram atualizadas. Não toca rows com slug já definido, na lixeira ou sem valor.
async function backfillCollection(
  dataDb: mongoose.mongo.Db,
  slug: string,
  fieldSlug: string,
): Promise<number> {
  const collection = dataDb.collection(slug);

  // Seed do conjunto de slugs já usados (garante unicidade na geração nova).
  const existing = await collection.distinct('sharedRowSlug');
  const used = new Set<string>();
  for (const value of existing) {
    if (typeof value === 'string' && value.length > 0) used.add(value);
  }

  const candidates = await collection
    .find({
      $and: [
        {
          $or: [{ sharedRowSlug: { $exists: false } }, { sharedRowSlug: null }],
        },
        { $or: [{ trashedAt: { $exists: false } }, { trashedAt: null }] },
      ],
    })
    .toArray();

  let rowsUpdated = 0;

  for (const row of candidates) {
    const raw: unknown = row[fieldSlug];
    if (raw === null || raw === undefined || raw === '') continue;

    const generated = FieldSlug.suggestUnique(String(raw), Array.from(used));
    used.add(generated);

    await collection.updateOne(
      { _id: row._id },
      { $set: { sharedRowSlug: generated } },
    );
    rowsUpdated++;
  }

  return rowsUpdated;
}

async function migrate(): Promise<void> {
  const logger = new TaskLogger(TITLE);

  if (!DATABASE_URL) {
    logger.failed('DATABASE_URL não configurada');
    process.exit(1);
  }

  const systemConn = mongoose.createConnection(DATABASE_URL, {
    dbName: DB_DATABASE,
  });
  await systemConn.asPromise();

  const dataConn = mongoose.createConnection(DATABASE_URL, {
    dbName: DB_DATA_DATABASE,
  });
  await dataConn.asPromise();

  const systemDb = systemConn.db!;
  const dataDb = dataConn.db!;

  const SettingMarkerSchema = new mongoose.Schema(
    {
      MIGRATION_ROW_SLUG_BACKFILL_AT: { type: Date, default: null },
      MIGRATION_ROW_SLUG_BACKFILL_FALLBACK_AT: { type: Date, default: null },
      MIGRATION_ROW_SLUG_BACKFILL_UNIVERSAL_AT: { type: Date, default: null },
    },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = systemConn.model<SettingMarkerDoc>(
    'SettingMarkerRowSlugBackfill',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const alreadyDone =
      setting?.MIGRATION_ROW_SLUG_BACKFILL_AT &&
      setting?.MIGRATION_ROW_SLUG_BACKFILL_FALLBACK_AT &&
      setting?.MIGRATION_ROW_SLUG_BACKFILL_UNIVERSAL_AT;

    if (alreadyDone && !FORCE) {
      logger.skipped(setting?.MIGRATION_ROW_SLUG_BACKFILL_AT ?? undefined);
      return;
    }

    logger.running();

    const tablesCol = systemDb.collection('tables');
    const fieldsCol = systemDb.collection('fields');

    // Varre TODAS as tabelas: as que já têm rowSlugFieldId usam o campo atual; as
    // antigas (sem rowSlugFieldId) ganham o primeiro TEXT_SHORT ativo via fallback.
    const tables = await tablesCol.find({}).toArray();

    const stats: MigrationStats = {
      tablesProcessed: 0,
      rowsUpdated: 0,
      fieldsAssigned: 0,
    };

    for (const table of tables) {
      const slug = table.slug;
      if (typeof slug !== 'string' || slug.length === 0) continue;

      const exists = await dataDb.listCollections({ name: slug }).hasNext();
      if (!exists) continue;

      // Resolve o campo de slug -> chave da coluna (field.slug) na row, com
      // fallback para o primeiro TEXT_SHORT ativo em tabelas sem rowSlugFieldId.
      const resolved = await resolveSlugFieldKey(tablesCol, fieldsCol, table);
      if (!resolved) {
        logger.item(`${slug} — sem campo TEXT_SHORT, pulada`);
        continue;
      }

      if (resolved.assigned) stats.fieldsAssigned++;

      const rowsUpdated = await backfillCollection(
        dataDb,
        slug,
        resolved.fieldSlug,
      );

      stats.tablesProcessed++;
      stats.rowsUpdated += rowsUpdated;

      let tag = '';
      if (resolved.assigned) tag = ' (campo de slug atribuído)';
      logger.item(`${slug} — slug gerado em ${rowsUpdated} rows${tag}`);
    }

    logger.done(
      `${stats.tablesProcessed} tabelas, ${stats.rowsUpdated} rows, ${stats.fieldsAssigned} campos atribuídos`,
    );

    const now = new Date();
    await SettingMarker.findOneAndUpdate(
      {},
      {
        $set: {
          MIGRATION_ROW_SLUG_BACKFILL_AT: now,
          MIGRATION_ROW_SLUG_BACKFILL_FALLBACK_AT: now,
          MIGRATION_ROW_SLUG_BACKFILL_UNIVERSAL_AT: now,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } finally {
    await systemConn.close();
    await dataConn.close();
  }
}

migrate().catch((error: unknown): void => {
  new TaskLogger(TITLE).failed(error);
  process.exit(1);
});
