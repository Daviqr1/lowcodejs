/**
 * Migration: sanitiza slugs de campo com caracteres especiais.
 *
 * Antes do commit `eb672abe` a criação de campo usava
 * `slugify(name, { lower: true, trim: true })` — sem `strict`. A allowlist
 * interna do slugify preserva `. : $ * _ ~ ( ) ' " ! @`, então um campo
 * chamado "Processo SEI n°.:" virava `slug = "processo-sei-n."`.
 *
 * Esse slug é usado como CHAVE do documento de row. Qualquer `$set` com ponto
 * no nome vira dot-notation e o Mongo recusa:
 *
 *   MongoServerError: The update path 'processo-sei-n.' contains an empty
 *   field name, which is not allowed. (code 56, EmptyFieldName)
 *
 * O código atual (`FieldSlug`, com `strict: true`) já não consegue gerar esses
 * slugs. Esta migration limpa o passivo: renomeia o slug de cada campo fora do
 * `FIELD_SLUG_PATTERN`, preservando o `name`/label como o usuário digitou e
 * movendo os valores já gravados para a chave nova.
 *
 * Pontos atualizados por campo renomeado:
 *   - `fields.slug` (+ `fields.group.slug` quando o campo é um FIELD_GROUP)
 *   - `fields.relationship.field.slug` — cópia denormalizada em outros campos
 *   - `tables._schema` (top-level) ou `tables.groups[]._schema` (campo de grupo)
 *   - `tables.fieldOrder{List,Form,Filter,Detail}`, `tables.order.field`,
 *     `tables.layoutFields.*`, `tables.groups[].slug`
 *   - configs do plugin cascade-dropdown
 *   - a chave nas rows da collection da tabela (DB data)
 *
 * `$rename` NÃO serve aqui: com ponto no nome, todo operador por path quebra.
 * A renomeação usa `$setField`/`$unsetField`/`$getField` (MongoDB 5.0+), que
 * tratam o nome do campo literalmente.
 *
 * Campos nativos são pulados: `_id`, `createdAt`, `updatedAt` e `trashedAt`
 * violam o `FIELD_SLUG_PATTERN` por design.
 *
 * Marker: MIGRATION_FIELD_SLUG_SANITIZE_AT
 *
 * Usage:
 *   node ... 29-migrate-sanitize-field-slugs.ts             # skip se marker setado
 *   node ... 29-migrate-sanitize-field-slugs.ts --dry-run   # só lista, não grava
 *   node ... 29-migrate-sanitize-field-slugs.ts --force     # ignora o marker
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
const DRY_RUN = process.argv.includes('--dry-run');
const TITLE = 'Slugs de campo com caracteres especiais';

const CASCADE_COLLECTION = 'cascade_dropdown_field_configs';

// Arrays de `table` que guardam slug de campo.
const FIELD_ORDER_KEYS = [
  'fieldOrderList',
  'fieldOrderForm',
  'fieldOrderFilter',
  'fieldOrderDetail',
];

// Chaves de `table.layoutFields` que guardam slug de campo.
const LAYOUT_FIELD_KEYS = [
  'title',
  'description',
  'cover',
  'category',
  'startDate',
  'endDate',
  'color',
  'participants',
  'reminder',
];

type SettingMarkerDoc = {
  MIGRATION_FIELD_SLUG_SANITIZE_AT?: Date | null;
};

type Rename = {
  fieldId: mongoose.Types.ObjectId;
  name: string;
  oldSlug: string;
  newSlug: string;
  // Slug do grupo dono do campo; null quando o campo é top-level.
  groupSlug: string | null;
  // true quando o próprio campo é um FIELD_GROUP (o slug também nomeia o grupo).
  isGroup: boolean;
};

type Stats = {
  tables: number;
  fields: number;
  rows: number;
};

// Expressão de agregação que renomeia uma chave dentro de `input`, tratando o
// nome literalmente (funciona com ponto/cifrão, ao contrário de `$rename`).
function renameKey(
  input: string,
  oldKey: string,
  newKey: string,
): Record<string, unknown> {
  return {
    $setField: {
      field: newKey,
      input: { $unsetField: { field: oldKey, input } },
      value: { $getField: { field: oldKey, input } },
    },
  };
}

// Filtro que casa só documentos onde a chave existe de fato.
function hasKeyFilter(key: string): Record<string, unknown> {
  return {
    $expr: {
      $ne: [
        { $type: { $getField: { field: key, input: '$$ROOT' } } },
        'missing',
      ],
    },
  };
}

// `table.fields` / `group.fields` guardam ObjectIds, mas docs antigos podem ter
// subdocumentos completos — normaliza os dois formatos para uma lista de ids.
function toIdList(raw: unknown): mongoose.Types.ObjectId[] {
  if (!Array.isArray(raw)) return [];

  const ids: mongoose.Types.ObjectId[] = [];

  for (const entry of raw) {
    let candidate = entry;
    if (entry && typeof entry === 'object' && '_id' in entry)
      candidate = entry._id;

    if (!mongoose.isValidObjectId(candidate)) continue;
    ids.push(new mongoose.Types.ObjectId(String(candidate)));
  }

  return ids;
}

// Carrega os campos preservando a ordem declarada na tabela/grupo.
async function loadFields(
  fieldsCol: mongoose.mongo.Collection,
  raw: unknown,
): Promise<mongoose.mongo.Document[]> {
  const ids = toIdList(raw);
  if (ids.length === 0) return [];

  const docs = await fieldsCol.find({ _id: { $in: ids } }).toArray();
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));

  const ordered: mongoose.mongo.Document[] = [];
  for (const id of ids) {
    const doc = byId.get(String(id));
    if (doc) ordered.push(doc);
  }

  return ordered;
}

// Decide se o campo precisa de rename e escolhe o slug novo, já desambiguado
// contra os slugs em uso no mesmo escopo (tabela ou grupo).
function planField(
  field: mongoose.mongo.Document,
  used: Set<string>,
  groupSlug: string | null,
): Rename | null {
  const slug = field.slug;
  if (typeof slug !== 'string' || slug.length === 0) return null;
  if (field.native === true) return null;
  if (!FieldSlug.getError(slug)) return null;

  let name = slug;
  if (typeof field.name === 'string' && field.name.length > 0)
    name = field.name;

  const newSlug = FieldSlug.suggestUnique(name, Array.from(used));
  used.add(newSlug);

  return {
    fieldId: field._id,
    name,
    oldSlug: slug,
    newSlug,
    groupSlug,
    isGroup: field.type === E_FIELD_TYPE.FIELD_GROUP,
  };
}

async function planTable(
  fieldsCol: mongoose.mongo.Collection,
  table: mongoose.mongo.Document,
): Promise<Rename[]> {
  const renames: Rename[] = [];

  const topFields = await loadFields(fieldsCol, table.fields);
  const usedInTable = new Set<string>();
  for (const field of topFields) {
    if (typeof field.slug === 'string') usedInTable.add(field.slug);
  }

  for (const field of topFields) {
    const rename = planField(field, usedInTable, null);
    if (rename) renames.push(rename);
  }

  let groups: mongoose.mongo.Document[] = [];
  if (Array.isArray(table.groups)) groups = table.groups;

  for (const group of groups) {
    if (typeof group.slug !== 'string') continue;

    const groupFields = await loadFields(fieldsCol, group.fields);
    const usedInGroup = new Set<string>();
    for (const field of groupFields) {
      if (typeof field.slug === 'string') usedInGroup.add(field.slug);
    }

    for (const field of groupFields) {
      const rename = planField(field, usedInGroup, group.slug);
      if (rename) renames.push(rename);
    }
  }

  return renames;
}

// Atualiza os metadados de ordem/layout da tabela. Mutação in-place em `table`
// para que renames seguintes na mesma tabela leiam os arrays já corrigidos.
async function applyTableMetadata(
  tablesCol: mongoose.mongo.Collection,
  table: mongoose.mongo.Document,
  rename: Rename,
): Promise<void> {
  const update: Record<string, unknown> = {};

  for (const key of FIELD_ORDER_KEYS) {
    const current = table[key];
    if (!Array.isArray(current)) continue;
    if (!current.includes(rename.oldSlug)) continue;

    const next = current.map((slug) => {
      if (slug === rename.oldSlug) return rename.newSlug;
      return slug;
    });

    table[key] = next;
    update[key] = next;
  }

  if (table.order?.field === rename.oldSlug) {
    table.order.field = rename.newSlug;
    update['order.field'] = rename.newSlug;
  }

  for (const key of LAYOUT_FIELD_KEYS) {
    if (table.layoutFields?.[key] !== rename.oldSlug) continue;
    table.layoutFields[key] = rename.newSlug;
    update[`layoutFields.${key}`] = rename.newSlug;
  }

  if (Object.keys(update).length === 0) return;

  await tablesCol.updateOne({ _id: table._id }, { $set: update });
}

// Configs do plugin cascade-dropdown guardam slug de campo sem validação de
// pattern — best-effort para não deixar a config apontando para o slug antigo.
async function applyCascadeConfigs(
  systemDb: mongoose.mongo.Db,
  tableSlug: unknown,
  rename: Rename,
): Promise<void> {
  if (typeof tableSlug !== 'string' || tableSlug.length === 0) return;

  const configs = systemDb.collection(CASCADE_COLLECTION);

  await configs.updateMany(
    { targetTableSlug: tableSlug, targetFieldSlug: rename.oldSlug },
    { $set: { targetFieldSlug: rename.newSlug } },
  );

  await configs.updateMany(
    { sourceTableSlug: tableSlug, parentFieldSlug: rename.oldSlug },
    { $set: { parentFieldSlug: rename.newSlug } },
  );

  await configs.updateMany(
    { sourceTableSlug: tableSlug, childFieldSlug: rename.oldSlug },
    { $set: { childFieldSlug: rename.newSlug } },
  );

  await configs.updateMany(
    { sourceTableSlug: tableSlug, 'filters.fieldSlug': rename.oldSlug },
    { $set: { 'filters.$[entry].fieldSlug': rename.newSlug } },
    { arrayFilters: [{ 'entry.fieldSlug': rename.oldSlug }] },
  );
}

// Move os valores já gravados para a chave nova. Retorna quantas rows mudaram.
async function applyRows(
  dataDb: mongoose.mongo.Db,
  tableSlug: unknown,
  rename: Rename,
): Promise<number> {
  if (typeof tableSlug !== 'string' || tableSlug.length === 0) return 0;

  const existing = await dataDb.listCollections({ name: tableSlug }).toArray();
  if (existing.length === 0) return 0;

  const collection = dataDb.collection(tableSlug);

  if (rename.groupSlug === null) {
    const result = await collection.updateMany(hasKeyFilter(rename.oldSlug), [
      { $replaceWith: renameKey('$$ROOT', rename.oldSlug, rename.newSlug) },
    ]);
    return result.modifiedCount;
  }

  // Campo dentro de um FIELD_GROUP: a chave vive em cada subdocumento do array
  // do grupo. `$setField` no array inteiro porque o slug do grupo também pode
  // estar corrompido neste ponto (o rename do grupo roda depois).
  const result = await collection.updateMany(hasKeyFilter(rename.groupSlug), [
    {
      $replaceWith: {
        $setField: {
          field: rename.groupSlug,
          input: '$$ROOT',
          value: {
            $map: {
              input: {
                $ifNull: [
                  { $getField: { field: rename.groupSlug, input: '$$ROOT' } },
                  [],
                ],
              },
              as: 'item',
              in: renameKey('$$item', rename.oldSlug, rename.newSlug),
            },
          },
        },
      },
    },
  ]);

  return result.modifiedCount;
}

async function applyRename(
  systemDb: mongoose.mongo.Db,
  dataDb: mongoose.mongo.Db,
  table: mongoose.mongo.Document,
  rename: Rename,
): Promise<number> {
  const fieldsCol = systemDb.collection('fields');
  const tablesCol = systemDb.collection('tables');

  const fieldUpdate: Record<string, unknown> = { slug: rename.newSlug };
  if (rename.isGroup) fieldUpdate['group.slug'] = rename.newSlug;
  await fieldsCol.updateOne({ _id: rename.fieldId }, { $set: fieldUpdate });

  await fieldsCol.updateMany(
    { 'relationship.field._id': rename.fieldId },
    { $set: { 'relationship.field.slug': rename.newSlug } },
  );

  if (rename.groupSlug === null) {
    await tablesCol.updateOne({ _id: table._id }, [
      {
        $set: {
          _schema: renameKey('$_schema', rename.oldSlug, rename.newSlug),
        },
      },
    ]);

    await applyTableMetadata(tablesCol, table, rename);
  }

  if (rename.groupSlug !== null) {
    await tablesCol.updateOne({ _id: table._id }, [
      {
        $set: {
          groups: {
            $map: {
              input: '$groups',
              as: 'group',
              in: {
                $cond: [
                  { $eq: ['$$group.slug', rename.groupSlug] },
                  {
                    $mergeObjects: [
                      '$$group',
                      {
                        _schema: renameKey(
                          '$$group._schema',
                          rename.oldSlug,
                          rename.newSlug,
                        ),
                      },
                    ],
                  },
                  '$$group',
                ],
              },
            },
          },
        },
      },
    ]);
  }

  if (rename.isGroup) {
    await tablesCol.updateOne(
      { _id: table._id, 'groups.slug': rename.oldSlug },
      { $set: { 'groups.$.slug': rename.newSlug } },
    );
  }

  await applyCascadeConfigs(systemDb, table.slug, rename);

  return applyRows(dataDb, table.slug, rename);
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
    { MIGRATION_FIELD_SLUG_SANITIZE_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = systemConn.model<SettingMarkerDoc>(
    'SettingMarkerFieldSlugSanitize',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_FIELD_SLUG_SANITIZE_AT;
    if (appliedAt && !FORCE && !DRY_RUN) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();

    const tablesCol = systemDb.collection('tables');
    const fieldsCol = systemDb.collection('fields');
    const tables = await tablesCol.find({}).toArray();

    const stats: Stats = { tables: 0, fields: 0, rows: 0 };

    for (const table of tables) {
      const renames = await planTable(fieldsCol, table);
      if (renames.length === 0) continue;

      stats.tables++;
      stats.fields += renames.length;

      // Campos internos de grupo primeiro: renomear o grupo muda a chave do
      // array que eles usam como caminho.
      const ordered = [
        ...renames.filter((rename) => !rename.isGroup),
        ...renames.filter((rename) => rename.isGroup),
      ];

      for (const rename of ordered) {
        logger.item(
          `${table.slug} › ${rename.name}: "${rename.oldSlug}" → "${rename.newSlug}"`,
        );

        if (DRY_RUN) continue;

        stats.rows += await applyRename(systemDb, dataDb, table, rename);
      }
    }

    if (DRY_RUN) {
      logger.done(
        `simulação: ${stats.fields} campo(s) em ${stats.tables} tabela(s) — nada gravado`,
      );
      return;
    }

    logger.done(
      `${stats.fields} campo(s) em ${stats.tables} tabela(s), ${stats.rows} registro(s) atualizados`,
    );

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_FIELD_SLUG_SANITIZE_AT: new Date() } },
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
