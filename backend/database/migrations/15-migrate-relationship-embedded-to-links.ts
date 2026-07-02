/**
 * Migration: converte relacionamentos embedded (array de ObjectIds em
 * `row[field.slug]`) para o modelo de pivô (RelationshipDefinition +
 * RelationshipLink).
 *
 * Para cada campo RELATIONSHIP top-level ainda não migrado
 * (`relationship.relationshipId` ausente):
 *  1. Resolve tabela source (a que contém o campo) e target (relationship.table).
 *  2. Detecta N:N: se algum registro target é referenciado por >1 source, o
 *     lado target vira `multiple` (senão 1:N, target single).
 *  3. Cria o campo-espelho no target (`visible:false`, multiple conforme acima).
 *  4. Cria a RelationshipDefinition (onDelete=CASCADE) e seta
 *     `relationshipId`/`visible` no campo source e no espelho.
 *  5. Cria um RelationshipLink por ObjectId embedded (idempotente via índice
 *     único). Valida contagem por row antes de `$unset` do array embedded.
 *  6. Reconstrói `_schema` das duas tabelas e injeta o espelho em
 *     `target.fields` + `fieldOrder*`.
 *
 * Idempotente: campos já com `relationshipId` são pulados; índice único impede
 * links duplicados; `$unset` é no-op em rows já limpas. Marker só é gravado se
 * nenhum campo falhar (campos pendentes reprocessam no próximo boot).
 *
 * Idempotente via marker no Setting singleton:
 *   MIGRATION_RELATIONSHIP_EMBEDDED_TO_LINKS_AT
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/15-migrate-relationship-embedded-to-links.ts
 *   node --import @swc-node/register/esm-register database/migrations/15-migrate-relationship-embedded-to-links.ts -- --force
 *   (no boot Docker roda via scripts/migrations/15-migrate-relationship-embedded-to-links.sh)
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name (fields, tables, relationship-*)
 *   DB_DATA_DATABASE - Data database name (dynamic row collections)
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import {
  buildFieldPermissions,
  E_RELATIONSHIP_ON_DELETE,
  E_SCHEMA_TYPE,
} from '../../application/core/entity.core';
import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const DB_DATA_DATABASE = process.env.DB_DATA_DATABASE || 'lowcodejs_data';
const FORCE = process.argv.includes('--force');
const TITLE = 'Relacionamentos embedded → links';

type SettingMarkerDoc = {
  MIGRATION_RELATIONSHIP_EMBEDDED_TO_LINKS_AT?: Date | null;
};

type ObjectId = mongoose.Types.ObjectId;

type FieldDoc = {
  _id: ObjectId;
  name?: string;
  slug: string;
  type?: string;
  multiple?: boolean;
  native?: boolean;
  trashed?: boolean;
  group?: { slug?: string } | null;
  relationship?: {
    table?: { _id?: ObjectId | null; slug?: string };
    field?: { _id?: ObjectId | null; slug?: string };
    relationshipId?: ObjectId | null;
  } | null;
};

type TableDoc = {
  _id: ObjectId;
  name?: string;
  slug: string;
  rowSlugFieldId?: ObjectId | null;
  fields?: ObjectId[];
  fieldOrderList?: ObjectId[];
  fieldOrderForm?: ObjectId[];
  fieldOrderFilter?: ObjectId[];
  fieldOrderDetail?: ObjectId[];
};

// Campo legível da tabela source para rótulo do espelho (sem seletor manual):
// rowSlug, senão 1º texto, senão 1º não-nativo, senão o fallback informado.
async function resolveSourceLabelField(
  systemDb: mongoose.mongo.Db,
  sourceTable: TableDoc,
  fallback: { _id: ObjectId; slug: string },
): Promise<{ _id: ObjectId; slug: string }> {
  const fieldsCol = systemDb.collection<FieldDoc>('fields');
  if (sourceTable.rowSlugFieldId) {
    const slugField = await fieldsCol.findOne({
      _id: sourceTable.rowSlugFieldId,
    });
    if (slugField) return { _id: slugField._id, slug: slugField.slug };
  }
  const ids = sourceTable.fields ?? [];
  const candidates = await fieldsCol.find({ _id: { $in: ids } }).toArray();
  const textField = candidates.find(
    (f) => f.native !== true && f.trashed !== true && f.type === 'TEXT_SHORT',
  );
  if (textField) return { _id: textField._id, slug: textField.slug };
  const anyField = candidates.find(
    (f) => f.native !== true && f.trashed !== true,
  );
  if (anyField) return { _id: anyField._id, slug: anyField.slug };
  return fallback;
}

function toIdArray(value: unknown): string[] {
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

// Constrói um doc de campo RELATIONSHIP-espelho com os mesmos defaults de um
// campo criado normalmente (insert raw não aplica defaults do schema Mongoose).
function buildMirrorFieldDoc(params: {
  _id: ObjectId;
  name: string;
  slug: string;
  multiple: boolean;
  sourceTable: TableDoc;
  labelField: { _id: ObjectId; slug: string };
  relationshipId: ObjectId;
  now: Date;
}): Record<string, unknown> {
  return {
    _id: params._id,
    name: params.name,
    slug: params.slug,
    type: 'RELATIONSHIP',
    required: false,
    multiple: params.multiple,
    format: null,
    showInFilter: false,
    permissions: buildFieldPermissions(true, true, true),
    widthInForm: 50,
    widthInList: 10,
    widthInDetail: null,
    tip: null,
    defaultValue: null,
    locked: false,
    native: false,
    allowCustomDropdownOptions: false,
    allowCreateRelationshipRecords: false,
    relationship: {
      table: { _id: params.sourceTable._id, slug: params.sourceTable.slug },
      field: params.labelField,
      order: 'asc',
      customLabel: false,
      labelParts: [],
      labelSeparator: ' - ',
      visible: false,
      relationshipId: params.relationshipId,
      side: 'target',
      formMode: 'select',
    },
    dropdown: [],
    category: [],
    group: null,
    createdAt: params.now,
    updatedAt: params.now,
    trashed: false,
    trashedAt: null,
  };
}

// Fragmento de _schema de um campo RELATIONSHIP (espelha o MongooseSchemaBuilder):
// array de ObjectId com ref para a tabela alvo, sempre required:false (os valores
// vivem nos links; obrigatoriedade é validada no use-case).
function relationshipSchemaFragment(refTableId: ObjectId): unknown {
  return [
    {
      type: E_SCHEMA_TYPE.OBJECT_ID,
      required: false,
      ref: refTableId.toString(),
    },
  ];
}

async function setSchemaPath(
  systemDb: mongoose.mongo.Db,
  tableId: ObjectId,
  fieldSlug: string,
  refTableId: ObjectId,
): Promise<void> {
  await systemDb.collection('tables').updateOne(
    { _id: tableId },
    {
      $set: {
        [`_schema.${fieldSlug}`]: relationshipSchemaFragment(refTableId),
      },
    },
  );
}

async function migrateField(
  systemDb: mongoose.mongo.Db,
  dataDb: mongoose.mongo.Db,
  field: FieldDoc,
  logger: TaskLogger,
): Promise<'migrated' | 'skipped' | 'failed'> {
  const tablesCol = systemDb.collection<TableDoc>('tables');
  const fieldsCol = systemDb.collection<FieldDoc>('fields');
  const defsCol = systemDb.collection('relationship-definitions');
  const linksCol = systemDb.collection('relationship-links');

  const sourceTable = await tablesCol.findOne({ fields: field._id });
  if (!sourceTable) {
    logger.item(`${field.slug} — tabela source não encontrada, pulado`);
    return 'skipped';
  }

  const targetRef = field.relationship?.table;
  let targetTable: TableDoc | null = null;
  if (targetRef?._id) {
    targetTable = await tablesCol.findOne({ _id: targetRef._id });
  }
  if (!targetTable && targetRef?.slug) {
    targetTable = await tablesCol.findOne({ slug: targetRef.slug });
  }
  if (!targetTable) {
    logger.item(`${field.slug} — tabela target não encontrada, pulado`);
    return 'skipped';
  }

  // Lê os arrays embedded das rows do source.
  const sourceCol = dataDb.collection(sourceTable.slug);
  const rows = await sourceCol
    .find({ [field.slug]: { $exists: true, $nin: [null, []] } })
    .toArray();

  // Detecta N:N: target referenciado por >1 source vira multiple.
  const targetRefCount = new Map<string, number>();
  for (const row of rows) {
    for (const id of toIdArray(row[field.slug])) {
      targetRefCount.set(id, (targetRefCount.get(id) ?? 0) + 1);
    }
  }
  let targetMultiple = false;
  for (const count of targetRefCount.values()) {
    if (count > 1) {
      targetMultiple = true;
      break;
    }
  }

  const now = new Date();
  const definitionId = new mongoose.Types.ObjectId();
  const mirrorFieldId = new mongoose.Types.ObjectId();
  const mirrorSlug = `${sourceTable.slug}__rel_${field.slug}`;

  // 1. Campo-espelho no target.
  const mirrorLabelField = await resolveSourceLabelField(
    systemDb,
    sourceTable,
    {
      _id: field._id,
      slug: field.slug,
    },
  );
  const mirrorDoc = buildMirrorFieldDoc({
    _id: mirrorFieldId,
    name: sourceTable.name ?? sourceTable.slug,
    slug: mirrorSlug,
    multiple: targetMultiple,
    sourceTable,
    labelField: mirrorLabelField,
    relationshipId: definitionId,
    now,
  });
  // Collection sem tipagem generica: o doc-espelho é um Record completo.
  await systemDb.collection('fields').insertOne(mirrorDoc);

  // 2. RelationshipDefinition.
  await defsCol.insertOne({
    _id: definitionId,
    name: `${sourceTable.name ?? sourceTable.slug} ↔ ${targetTable.name ?? targetTable.slug}`,
    source: {
      table: { _id: sourceTable._id, slug: sourceTable.slug },
      field: { _id: field._id, slug: field.slug },
      visible: true,
      label: field.name ?? field.slug,
    },
    target: {
      table: { _id: targetTable._id, slug: targetTable.slug },
      field: { _id: mirrorFieldId, slug: mirrorSlug },
      visible: false,
      label: sourceTable.name ?? sourceTable.slug,
    },
    onDelete: E_RELATIONSHIP_ON_DELETE.CASCADE,
    trashed: false,
    trashedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  // 3. Links + validação por row antes do $unset.
  let linksCreated = 0;
  let failedRows = 0;
  for (const row of rows) {
    const ids = toIdArray(row[field.slug]);
    let order = 0;
    let okForRow = true;
    for (const targetId of ids) {
      try {
        await linksCol.updateOne(
          {
            relationshipId: definitionId,
            sourceId: row._id,
            targetId: new mongoose.Types.ObjectId(targetId),
          },
          {
            $setOnInsert: {
              relationshipId: definitionId,
              sourceId: row._id,
              targetId: new mongoose.Types.ObjectId(targetId),
              order,
              metadata: null,
              createdAt: now,
              updatedAt: now,
            },
          },
          { upsert: true },
        );
        linksCreated++;
        order++;
      } catch {
        okForRow = false;
      }
    }

    // $unset apenas quando todos os links da row existem (sem perda de dado).
    const linkCount = await linksCol.countDocuments({
      relationshipId: definitionId,
      sourceId: row._id,
    });
    if (okForRow && linkCount >= ids.length) {
      await sourceCol.updateOne(
        { _id: row._id },
        { $unset: { [field.slug]: '' } },
      );
    } else {
      failedRows++;
    }
  }

  // 4. Seta relationshipId/visible no campo source.
  await fieldsCol.updateOne(
    { _id: field._id },
    {
      $set: {
        'relationship.relationshipId': definitionId,
        'relationship.visible': true,
        'relationship.side': 'source',
        'relationship.formMode': 'select',
      },
    },
  );

  // 5. Injeta o espelho no target.fields + fieldOrder*.
  await tablesCol.updateOne(
    { _id: targetTable._id },
    {
      $addToSet: {
        fields: mirrorFieldId,
        fieldOrderList: mirrorFieldId,
        fieldOrderForm: mirrorFieldId,
        fieldOrderFilter: mirrorFieldId,
        fieldOrderDetail: mirrorFieldId,
      },
    },
  );

  // 6. Ajusta o _schema das duas tabelas para o campo de relacionamento
  // (source: required:false agora que os valores vivem nos links; target:
  // adiciona o path do espelho com ref para a tabela source).
  await setSchemaPath(systemDb, sourceTable._id, field.slug, targetTable._id);
  await setSchemaPath(systemDb, targetTable._id, mirrorSlug, sourceTable._id);

  if (failedRows > 0) {
    logger.item(
      `${field.slug} — ${linksCreated} links, ${failedRows} rows com divergência (embedded preservado)`,
    );
    return 'failed';
  }

  let cardinality = '1:N';
  if (targetMultiple) cardinality = 'N:N';
  logger.item(
    `${field.slug} — ${linksCreated} links criados, cardinalidade ${cardinality}`,
  );
  return 'migrated';
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
      MIGRATION_RELATIONSHIP_EMBEDDED_TO_LINKS_AT: {
        type: Date,
        default: null,
      },
    },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = systemConn.model<SettingMarkerDoc>(
    'SettingMarkerRelEmbeddedLinks',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_RELATIONSHIP_EMBEDDED_TO_LINKS_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();

    const fieldsCol = systemDb.collection<FieldDoc>('fields');
    // Top-level (group null/ausente) e ainda não migrado (sem relationshipId).
    const relFields = await fieldsCol
      .find({
        type: 'RELATIONSHIP',
        $and: [
          { $or: [{ group: null }, { group: { $exists: false } }] },
          {
            $or: [
              { 'relationship.relationshipId': null },
              { 'relationship.relationshipId': { $exists: false } },
            ],
          },
        ],
      })
      .toArray();

    let migrated = 0;
    let skipped = 0;
    let failed = 0;
    for (const field of relFields) {
      const result = await migrateField(systemDb, dataDb, field, logger);
      if (result === 'migrated') migrated++;
      if (result === 'skipped') skipped++;
      if (result === 'failed') failed++;
    }

    logger.done(
      `${migrated} migrados, ${skipped} pulados, ${failed} com divergência`,
    );

    // Marker só quando nenhum campo divergiu — pendentes reprocessam no boot.
    if (failed === 0) {
      await SettingMarker.findOneAndUpdate(
        {},
        { $set: { MIGRATION_RELATIONSHIP_EMBEDDED_TO_LINKS_AT: new Date() } },
        { upsert: true, setDefaultsOnInsert: true },
      );
    }
  } finally {
    await systemConn.close();
    await dataConn.close();
  }
}

migrate().catch((error: unknown): void => {
  new TaskLogger(TITLE).failed(error);
  process.exit(1);
});
