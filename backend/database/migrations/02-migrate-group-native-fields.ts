/**
 * Migration: Backfill native fields in tables and field groups.
 *
 * Garante que os campos nativos existam tanto no NIVEL RAIZ da tabela
 * (FIELD_NATIVE_LIST) quanto em cada subtabela de grupo de campos
 * (FIELD_GROUP_NATIVE_LIST). Nativos ausentes sao criados na collection `fields`
 * e seus ObjectIds anexados a `table.fields` (+ arrays `fieldOrder*` no nivel
 * raiz) ou a `groups[X].fields`.
 *
 * Cobre tambem os campos nativos de auditoria UPDATED_AT (updatedAt) e UPDATER
 * (updater) — adicionados a essas listas. Por isso o marker foi versionado
 * (MIGRATION_NATIVE_FIELDS_AT): bases que ja haviam migrado os nativos antigos
 * re-rodam uma vez para ganhar os novos campos. Idempotente por slug — re-rodar
 * nunca duplica.
 *
 * Idempotente via marker no Setting singleton:
 *   MIGRATION_NATIVE_FIELDS_AT
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/02-migrate-group-native-fields.ts            # backfill (skips if already migrated)
 *   node --import @swc-node/register/esm-register database/migrations/02-migrate-group-native-fields.ts -- --force # re-run, ignoring marker
 *   (no boot Docker roda via scripts/migrations/02-migrate-group-native-fields.sh)
 *
 * Environment variables required:
 *   DATABASE_URL - MongoDB connection string
 *   DB_DATABASE  - System database name
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import {
  FIELD_GROUP_NATIVE_LIST,
  FIELD_NATIVE_LIST,
} from '../../application/core/entity.core';
import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'Campos nativos (tabela + grupos)';

const ORDER_KEYS = [
  'fieldOrderList',
  'fieldOrderForm',
  'fieldOrderFilter',
  'fieldOrderDetail',
] as const;

type SettingMarkerDoc = {
  MIGRATION_NATIVE_FIELDS_AT?: Date | null;
};

async function backfillNativeFields(
  db: mongoose.mongo.Db,
  logger: TaskLogger,
): Promise<{
  tablesProcessed: number;
  tablesUpdated: number;
  groupsUpdated: number;
  fieldsCreated: number;
}> {
  const tablesCol = db.collection('tables');
  const fieldsCol = db.collection('fields');

  const tables = await tablesCol.find({ trashed: { $ne: true } }).toArray();

  if (tables.length === 0) {
    return {
      tablesProcessed: 0,
      tablesUpdated: 0,
      groupsUpdated: 0,
      fieldsCreated: 0,
    };
  }

  let tablesUpdated = 0;
  let groupsUpdated = 0;
  let fieldsCreated = 0;

  const slugsOf = async (
    ids: mongoose.mongo.BSON.ObjectId[],
  ): Promise<Set<string>> => {
    const existing = await fieldsCol
      .find({ _id: { $in: ids } })
      .project({ slug: 1 })
      .toArray();
    return new Set(existing.map((f) => f.slug));
  };

  for (const table of tables) {
    let tableChanged = false;

    // ── Nivel raiz: campos nativos da tabela ─────────────────────────────
    let fieldIds = [];
    if (Array.isArray(table.fields)) fieldIds = table.fields;
    const existingSlugs = await slugsOf(fieldIds);
    const missingNatives = FIELD_NATIVE_LIST.filter(
      (n) => !existingSlugs.has(n.slug),
    );

    if (missingNatives.length > 0) {
      const now = new Date();
      const docsToInsert = missingNatives.map((n) => ({
        ...n,
        group: null,
        trashed: false,
        trashedAt: null,
        createdAt: now,
        updatedAt: now,
      }));

      const insertResult = await fieldsCol.insertMany(docsToInsert);
      const newIds = Object.values(insertResult.insertedIds);

      const update: Record<string, unknown> = {
        fields: [...fieldIds, ...newIds],
      };
      for (const key of ORDER_KEYS) {
        let current = [];
        if (Array.isArray(table[key])) current = table[key];
        update[key] = [...current, ...newIds];
      }
      await tablesCol.updateOne({ _id: table._id }, { $set: update });

      tableChanged = true;
      fieldsCreated += newIds.length;

      const added = missingNatives.map((n) => n.slug).join(', ');
      logger.item(`${table.slug} — +${newIds.length} nativos (${added})`);
    }

    // ── Subtabelas de grupo de campos ────────────────────────────────────
    let groups = [];
    if (Array.isArray(table.groups)) groups = table.groups;
    let groupsChanged = false;

    for (let groupIdx = 0; groupIdx < groups.length; groupIdx++) {
      const group = groups[groupIdx];
      if (!group || typeof group !== 'object') continue;

      const groupSlug = group.slug;
      let groupFieldIds = [];
      if (Array.isArray(group.fields)) groupFieldIds = group.fields;

      const groupSlugs = await slugsOf(groupFieldIds);

      const missingGroupNatives = FIELD_GROUP_NATIVE_LIST.filter(
        (n) => !groupSlugs.has(n.slug),
      );

      if (missingGroupNatives.length === 0) continue;

      const now = new Date();
      const docsToInsert = missingGroupNatives.map((n) => ({
        ...n,
        group: { slug: groupSlug },
        widthInForm: n.widthInForm ?? 50,
        widthInList: n.widthInList ?? 10,
        widthInDetail: n.widthInDetail ?? 50,
        trashed: false,
        trashedAt: null,
        createdAt: now,
        updatedAt: now,
      }));

      const insertResult = await fieldsCol.insertMany(docsToInsert);
      const newIds = Object.values(insertResult.insertedIds);

      groups[groupIdx].fields = [...groupFieldIds, ...newIds];
      groupsChanged = true;
      groupsUpdated++;
      fieldsCreated += newIds.length;

      const added = missingGroupNatives.map((n) => n.slug).join(', ');
      logger.item(
        `${table.slug} → grupo "${groupSlug}" — +${newIds.length} nativos (${added})`,
      );
    }

    if (groupsChanged) {
      await tablesCol.updateOne({ _id: table._id }, { $set: { groups } });
      tableChanged = true;
    }

    if (tableChanged) tablesUpdated++;
  }

  return {
    tablesProcessed: tables.length,
    tablesUpdated,
    groupsUpdated,
    fieldsCreated,
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
      MIGRATION_NATIVE_FIELDS_AT: { type: Date, default: null },
    },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarker',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_NATIVE_FIELDS_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await backfillNativeFields(db, logger);
    logger.done(
      `${result.tablesProcessed} tabelas, ${result.tablesUpdated} atualizadas, ${result.groupsUpdated} grupos, ${result.fieldsCreated} campos criados`,
    );

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_NATIVE_FIELDS_AT: new Date() } },
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
