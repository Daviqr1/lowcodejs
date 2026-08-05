/**
 * Migration: promove campos RELATIONSHIP aninhados em FIELD_GROUP para o nível
 * top-level da tabela (RELATIONSHIP é sempre top-level, §2).
 *
 * O modelo antigo permitia criar RELATIONSHIP dentro de um grupo. Esta migration
 * desfaz isso ANTES da conversão embedded→links (migration 15):
 *  1. Remove o campo de `table.groups[].fields[]` e o adiciona em `table.fields`
 *     + `fieldOrder*`; seta `field.group = null`.
 *  2. Dado (lift + união dedup): para cada row, une (dedup) os ObjectIds do campo
 *     em todos os itens do subdoc do grupo num array top-level `row[field.slug]`
 *     e remove o campo de cada item do grupo.
 *
 * Não cria definitions/links nem mexe em `_schema`: a migration 15 (que roda em
 * seguida) processa o campo já top-level e finaliza o pivô.
 *
 * Idempotente: campos já top-level (group null) são ignorados; re-rodar é no-op.
 * Marker só é gravado se nenhum campo falhar.
 *
 * Idempotente via marker no Setting singleton:
 *   MIGRATION_RELATIONSHIP_LIFT_OUT_AT
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/14-migrate-relationship-lift-out-of-groups.ts
 *   node --import @swc-node/register/esm-register database/migrations/14-migrate-relationship-lift-out-of-groups.ts -- --force
 *   (no boot Docker roda via scripts/migrations/14-migrate-relationship-lift-out-of-groups.sh)
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name (fields, tables)
 *   DB_DATA_DATABASE - Data database name (dynamic row collections)
 */

import mongoose from 'mongoose';

import type { MigrationOutcome } from '../shared/migration-runner';
import { runMigration } from '../shared/migration-runner';
import type { TaskLogger } from '../shared/task-logger';

const TITLE = 'Relacionamentos: lift para fora de grupos';

type ObjectId = mongoose.Types.ObjectId;

type FieldDoc = {
  _id: ObjectId;
  slug: string;
  type?: string;
  group?: { slug?: string } | null;
};

type TableGroup = {
  slug: string;
  fields?: ObjectId[];
};

type TableDoc = {
  _id: ObjectId;
  slug: string;
  groups?: TableGroup[];
};

function toIdStrings(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  let items: unknown[] = [value];
  if (Array.isArray(value)) items = value;
  const ids: string[] = [];
  for (const item of items) {
    if (item === null || item === undefined) continue;
    const str = String(item);
    if (str.length > 0) ids.push(str);
  }
  return ids;
}

async function liftField(
  systemDb: mongoose.mongo.Db,
  dataDb: mongoose.mongo.Db,
  field: FieldDoc,
  logger: TaskLogger,
): Promise<'lifted' | 'skipped'> {
  const tablesCol = systemDb.collection<TableDoc>('tables');
  const fieldsCol = systemDb.collection<FieldDoc>('fields');

  const table = await tablesCol.findOne({ 'groups.fields': field._id });
  if (!table) {
    logger.item(`${field.slug} — grupo de origem não encontrado, pulado`);
    return 'skipped';
  }

  const group = (table.groups ?? []).find((g) =>
    (g.fields ?? []).some((id) => id.toString() === field._id.toString()),
  );
  if (!group) {
    logger.item(`${field.slug} — grupo de origem não encontrado, pulado`);
    return 'skipped';
  }

  // 1. Remove o campo do grupo e adiciona top-level.
  await tablesCol.updateOne(
    { _id: table._id, 'groups.slug': group.slug },
    { $pull: { 'groups.$.fields': field._id } },
  );
  await tablesCol.updateOne(
    { _id: table._id },
    {
      $addToSet: {
        fields: field._id,
        fieldOrderList: field._id,
        fieldOrderForm: field._id,
        fieldOrderFilter: field._id,
        fieldOrderDetail: field._id,
      },
    },
  );
  await fieldsCol.updateOne({ _id: field._id }, { $set: { group: null } });

  // 2. Lift do dado: une (dedup) os ObjectIds do campo em todos os itens do
  // subdoc do grupo num array top-level e remove o campo de cada item.
  const dataCol = dataDb.collection(table.slug);
  const rows = await dataCol
    .find({ [group.slug]: { $type: 'array' } })
    .toArray();

  let touchedRows = 0;
  for (const row of rows) {
    const items = row[group.slug];
    if (!Array.isArray(items) || items.length === 0) continue;

    const union: string[] = [];
    const seen = new Set<string>();
    const cleanedItems = items.map((item): unknown => {
      if (item === null || typeof item !== 'object') return item;
      const record = { ...item };
      for (const id of toIdStrings(record[field.slug])) {
        if (!seen.has(id)) {
          seen.add(id);
          union.push(id);
        }
      }
      delete record[field.slug];
      return record;
    });

    const objectIds = union.map((id) => new mongoose.Types.ObjectId(id));
    await dataCol.updateOne(
      { _id: row._id },
      { $set: { [group.slug]: cleanedItems, [field.slug]: objectIds } },
    );
    touchedRows++;
  }

  logger.item(`${field.slug} — promovido (${touchedRows} rows ajustadas)`);
  return 'lifted';
}

await runMigration({
  title: TITLE,
  marker: 'MIGRATION_RELATIONSHIP_LIFT_OUT_AT',
  withDataConnection: true,
  async run({ db, dataDb: rawDataDb, logger }): Promise<MigrationOutcome> {
    const systemDb = db;
    const dataDb = rawDataDb!;

    const fieldsCol = systemDb.collection<FieldDoc>('fields');
    // RELATIONSHIP ainda dentro de um grupo (group preenchido).
    const nestedFields = await fieldsCol
      .find({
        type: 'RELATIONSHIP',
        group: { $nin: [null] },
        'group.slug': { $exists: true },
      })
      .toArray();

    let lifted = 0;
    let skipped = 0;
    for (const field of nestedFields) {
      const result = await liftField(systemDb, dataDb, field, logger);
      if (result === 'lifted') lifted++;
      if (result === 'skipped') skipped++;
    }

    return {
      summary: `${lifted} promovidos, ${skipped} pulados`,
      keepPending: skipped > 0,
    };
  },
});
