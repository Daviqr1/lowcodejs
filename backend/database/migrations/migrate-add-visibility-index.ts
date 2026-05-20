/**
 * Migration: cria index `{ visibility: 1 }` em todas as tabelas no scope do
 * plugin core:visibility-by-role. Speeds up list queries de não-admins.
 *
 * Idempotente via marker MIGRATION_VISIBILITY_INDEX_AT no Setting singleton.
 * Roda em todo boot do container; segunda execução é no-op se marker set.
 *
 * Importante: rows são FLAT em mongo (visibility no top-level, não data.*).
 *
 * Usage:
 *   npm run migrate:visibility-index           # rodada normal (skip se marker set)
 *   npm run migrate:visibility-index -- --force # ignora marker
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name
 *   DB_DATA_DATABASE - Data database name (collections dinâmicas)
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

config({ path: '.env' });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const DB_DATA_DATABASE = process.env.DB_DATA_DATABASE || 'lowcodejs_data';
const FORCE = process.argv.includes('--force');
const PLUGIN_PKG = 'core';
const PLUGIN_ID = 'visibility-by-role';
const MARKER = 'MIGRATION_VISIBILITY_INDEX_AT';

type SettingMarkerDoc = {
  _id: mongoose.Types.ObjectId;
  [MARKER]?: Date | null;
};

async function setMarker(
  settings: mongoose.mongo.Collection,
  settingDoc: SettingMarkerDoc | null,
): Promise<void> {
  if (settingDoc) {
    await settings.updateOne(
      { _id: settingDoc._id },
      { $set: { [MARKER]: new Date() } },
    );
    console.info(`[visibility-index] Marker ${MARKER} registrado.`);
  }
}

async function run(): Promise<void> {
  if (!DATABASE_URL) {
    console.error('[visibility-index] DATABASE_URL is required');
    process.exit(1);
  }

  console.info(`[visibility-index] System DB: ${DB_DATABASE}`);
  console.info(`[visibility-index] Data DB: ${DB_DATA_DATABASE}`);
  if (FORCE) console.info('[visibility-index] Force: true (bypassing marker)');
  console.info('---');

  const systemConn = await mongoose
    .createConnection(DATABASE_URL, { dbName: DB_DATABASE })
    .asPromise();

  try {
    const settings = systemConn.collection<SettingMarkerDoc>('settings');
    const settingDoc = await settings.findOne<SettingMarkerDoc>({});

    if (!FORCE && settingDoc?.[MARKER]) {
      console.info(
        `[visibility-index] Marker já presente (${settingDoc[MARKER]!.toISOString()}), skip (use --force para re-executar).`,
      );
      return;
    }

    const extensions = systemConn.collection('extensions');
    const plugin = await extensions.findOne({
      pkg: PLUGIN_PKG,
      type: 'PLUGIN',
      extensionId: PLUGIN_ID,
    });

    if (!plugin || !plugin.enabled) {
      console.info(
        '[visibility-index] Plugin inativo ou ausente, nada a fazer.',
      );
      await setMarker(settings, settingDoc);
      return;
    }

    const tableIds: string[] =
      plugin.tableScope?.mode === 'specific'
        ? ((plugin.tableScope?.tableIds ?? []) as string[])
        : [];

    if (tableIds.length === 0) {
      console.info('[visibility-index] Scope vazio, nada a fazer.');
      await setMarker(settings, settingDoc);
      return;
    }

    console.info(
      `[visibility-index] ${tableIds.length} tabela(s) no scope. Criando indexes...`,
    );

    const dataConn = await mongoose
      .createConnection(DATABASE_URL, { dbName: DB_DATA_DATABASE })
      .asPromise();

    try {
      const tables = systemConn.collection('tables');
      const oids = tableIds.map((id) => new mongoose.Types.ObjectId(id));
      const tableDocs = await tables
        .find({ _id: { $in: oids } })
        .project({ slug: 1 })
        .toArray();

      let created = 0;
      for (const table of tableDocs) {
        if (!table.slug || typeof table.slug !== 'string') continue;
        try {
          await dataConn.db!.collection(table.slug).createIndex(
            { visibility: 1 },
            { background: true },
          );
          console.info(
            `[visibility-index] Index criado/garantido em '${table.slug}'.`,
          );
          created++;
        } catch (err) {
          console.error(
            `[visibility-index] Falha ao criar index em '${table.slug}':`,
            err,
          );
        }
      }

      console.info('---');
      console.info(
        `[visibility-index] Concluído. ${created} index(es) garantido(s).`,
      );
    } finally {
      await dataConn.close();
    }

    await setMarker(settings, settingDoc);
  } finally {
    await systemConn.close();
  }
}

run().catch((err: unknown) => {
  console.error('[visibility-index] Erro fatal:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
