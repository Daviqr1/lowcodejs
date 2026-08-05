/**
 * Migration: repara relacionamentos FK-inline cujo dado não chegou aos links.
 *
 * Dois sintomas tratados (ambos deixam a tabela "sem trazer dados" e, via
 * mirror cíclico, derrubavam o populate por OOM — corrigido em paralelo no
 * `populate-builder.service.ts`):
 *
 *  1. Definition materializada com 0 links, mas o array embedded sobreviveu em
 *     `row[source.field.slug]` (ObjectIds). A 15 criou a definition/espelho mas
 *     não converteu o embedded. → reconstrói os links a partir do embedded e
 *     faz `$unset` do array (links viram a fonte única).
 *
 *  2. Campo RELATIONSHIP não-materializado (`relationshipId` ausente) OU ainda
 *     em grupo (qualquer shape — fecha o vão das migrations 14/15, que filtram
 *     `group.slug`). → lifta para top-level + materializa (definition + espelho
 *     + links). Órfão (target inexistente) → `trash` + remoção de
 *     `table.fields`/`fieldOrder*` (tira da via de populate).
 *
 * Idempotente: links via índice único (upsert); definitions já materializadas
 * com embedded já `$unset` viram no-op. Marker só grava se nenhum campo/row
 * divergir — pendentes reprocessam no próximo boot.
 *
 * Idempotente via marker no Setting singleton:
 *   MIGRATION_RELATIONSHIP_REPAIR_AT
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/23-migrate-relationship-repair-unmaterialized.ts
 *   (boot Docker roda via scripts/migrations/23-migrate-relationship-repair-unmaterialized.sh)
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name (fields, tables, relationship-*)
 *   DB_DATA_DATABASE - Data database name (dynamic row collections)
 */

import mongoose from 'mongoose';

import {
  buildFieldPermissions,
  E_RELATIONSHIP_ON_DELETE,
  E_SCHEMA_TYPE,
} from '../../application/core/entity.core';
import type { MigrationOutcome } from '../shared/migration-runner';
import {
  reportMigrationFailure,
  runMigration,
} from '../shared/migration-runner';
import type { TaskLogger } from '../shared/task-logger';

const TITLE = 'Reparo de relacionamentos (links + não-materializados)';

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
  groups?: { slug?: string; fields?: ObjectId[] }[];
};

type DefinitionDoc = {
  _id: ObjectId;
  source?: {
    table?: { slug?: string };
    field?: { _id?: ObjectId; slug?: string };
  };
  target?: { field?: { _id?: ObjectId } };
};

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

// Cria um link por ObjectId embedded em `row[fieldSlug]` (idempotente via índice
// único) e faz `$unset` do array quando todos os links da row existem. Núcleo
// reusado pela materialização e pelo backfill de definitions já existentes.
async function backfillLinksFromEmbedded(
  dataDb: mongoose.mongo.Db,
  linksCol: mongoose.mongo.Collection,
  sourceSlug: string,
  fieldSlug: string,
  definitionId: ObjectId,
  now: Date,
): Promise<{ linksEnsured: number; failedRows: number }> {
  const sourceCol = dataDb.collection(sourceSlug);
  const rows = await sourceCol
    .find({ [fieldSlug]: { $exists: true, $nin: [null, []] } })
    .toArray();

  let linksEnsured = 0;
  let failedRows = 0;
  for (const row of rows) {
    const ids = toIdArray(row[fieldSlug]);
    let order = 0;
    let okForRow = true;
    for (const targetId of ids) {
      try {
        const targetObjectId = new mongoose.Types.ObjectId(targetId);
        await linksCol.updateOne(
          {
            relationshipId: definitionId,
            sourceId: row._id,
            targetId: targetObjectId,
          },
          {
            $setOnInsert: {
              relationshipId: definitionId,
              sourceId: row._id,
              targetId: targetObjectId,
              order,
              metadata: null,
              createdAt: now,
              updatedAt: now,
            },
          },
          { upsert: true },
        );
        linksEnsured++;
        order++;
      } catch {
        okForRow = false;
      }
    }

    const linkCount = await linksCol.countDocuments({
      relationshipId: definitionId,
      sourceId: row._id,
    });
    if (okForRow && linkCount >= ids.length) {
      await sourceCol.updateOne(
        { _id: row._id },
        { $unset: { [fieldSlug]: '' } },
      );
    } else {
      failedRows++;
    }
  }

  return { linksEnsured, failedRows };
}

// Campo legível da tabela source para rótulo do espelho (idêntico à #15).
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

// Lifta um campo RELATIONSHIP de dentro de um grupo para o top-level. Tolerante
// a `group` sem `slug`: o $pull usa arrayFilters pelo id do campo. Lifta o dado
// embedded apenas quando há slug de grupo.
async function liftFromGroup(
  systemDb: mongoose.mongo.Db,
  dataDb: mongoose.mongo.Db,
  field: FieldDoc,
  logger: TaskLogger,
): Promise<void> {
  const tablesCol = systemDb.collection<TableDoc>('tables');
  const fieldsCol = systemDb.collection<FieldDoc>('fields');

  const table = await tablesCol.findOne({ 'groups.fields': field._id });
  if (!table) {
    await fieldsCol.updateOne({ _id: field._id }, { $set: { group: null } });
    return;
  }

  await tablesCol.updateOne(
    { _id: table._id },
    { $pull: { 'groups.$[g].fields': field._id } },
    { arrayFilters: [{ 'g.fields': field._id }] },
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

  const groupSlug = field.group?.slug;
  if (!groupSlug) {
    logger.item(`${field.slug} — liftado (grupo sem slug, sem dado embedded)`);
    return;
  }

  const dataCol = dataDb.collection(table.slug);
  const rows = await dataCol
    .find({ [groupSlug]: { $type: 'array' } })
    .toArray();

  let touchedRows = 0;
  for (const row of rows) {
    const items = row[groupSlug];
    if (!Array.isArray(items) || items.length === 0) continue;

    const union: string[] = [];
    const seen = new Set<string>();
    const cleanedItems = items.map((item): unknown => {
      if (item === null || typeof item !== 'object') return item;
      const record = { ...item };
      for (const id of toIdArray(record[field.slug])) {
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
      { $set: { [groupSlug]: cleanedItems, [field.slug]: objectIds } },
    );
    touchedRows++;
  }

  logger.item(`${field.slug} — liftado (${touchedRows} rows ajustadas)`);
}

// Tira o campo da via de populate quando não dá para materializar (target
// inexistente): trash + remoção de table.fields/fieldOrder*.
async function quarantineOrphan(
  systemDb: mongoose.mongo.Db,
  field: FieldDoc,
  now: Date,
  logger: TaskLogger,
): Promise<void> {
  const fieldsCol = systemDb.collection<FieldDoc>('fields');
  const tablesCol = systemDb.collection<TableDoc>('tables');

  await fieldsCol.updateOne(
    { _id: field._id },
    { $set: { trashed: true, trashedAt: now } },
  );
  await tablesCol.updateMany(
    { fields: field._id },
    {
      $pull: {
        fields: field._id,
        fieldOrderList: field._id,
        fieldOrderForm: field._id,
        fieldOrderFilter: field._id,
        fieldOrderDetail: field._id,
      },
    },
  );
  logger.item(`${field.slug} — órfão (target inexistente): trashed + removido`);
}

// Materializa um campo top-level (definition + espelho + links). Mesma lógica
// da #15.
async function materializeField(
  systemDb: mongoose.mongo.Db,
  dataDb: mongoose.mongo.Db,
  field: FieldDoc,
  now: Date,
  logger: TaskLogger,
): Promise<'materialized' | 'orphan' | 'deleted' | 'failed'> {
  const tablesCol = systemDb.collection<TableDoc>('tables');
  const fieldsCol = systemDb.collection<FieldDoc>('fields');
  const defsCol = systemDb.collection('relationship-definitions');
  const linksCol = systemDb.collection('relationship-links');

  const sourceTable = await tablesCol.findOne({
    $or: [{ fields: field._id }, { 'groups.fields': field._id }],
  });
  if (!sourceTable) {
    await fieldsCol.deleteOne({ _id: field._id });
    logger.item(`${field.slug} — campo órfão (sem tabela): deletado`);
    return 'deleted';
  }

  const targetRef = field.relationship?.table;
  let targetTable: TableDoc | null = null;
  if (targetRef?._id) {
    targetTable = await tablesCol.findOne({ _id: targetRef._id });
  }
  if (!targetTable && targetRef?.slug) {
    targetTable = await tablesCol.findOne({ slug: targetRef.slug });
  }
  if (!targetTable) return 'orphan';

  const sourceCol = dataDb.collection(sourceTable.slug);
  const rows = await sourceCol
    .find({ [field.slug]: { $exists: true, $nin: [null, []] } })
    .toArray();

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

  const definitionId = new mongoose.Types.ObjectId();
  // Idempotência: se já existe def não-trashed para este campo source, religa o
  // campo e sai — nunca duplica def/espelho (era o gap que gerava as duplicatas).
  // O índice UNIQUE parcial da migration 28 também impediria o insert.
  const existingDef = await defsCol.findOne({
    trashed: { $ne: true },
    'source.field._id': field._id,
  });
  if (existingDef) {
    await fieldsCol.updateOne(
      { _id: field._id },
      { $set: { 'relationship.relationshipId': existingDef._id } },
    );
    return 'materialized';
  }

  const mirrorFieldId = new mongoose.Types.ObjectId();
  const mirrorSlug = `${sourceTable.slug}__rel_${field.slug}`;

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
  await systemDb.collection('fields').insertOne(mirrorDoc);

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

  const { linksEnsured, failedRows } = await backfillLinksFromEmbedded(
    dataDb,
    linksCol,
    sourceTable.slug,
    field.slug,
    definitionId,
    now,
  );

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

  await setSchemaPath(systemDb, sourceTable._id, field.slug, targetTable._id);
  await setSchemaPath(systemDb, targetTable._id, mirrorSlug, sourceTable._id);

  if (failedRows > 0) {
    logger.item(
      `${field.slug} — ${linksEnsured} links, ${failedRows} rows com divergência (embedded preservado)`,
    );
    return 'failed';
  }

  let cardinality = '1:N';
  if (targetMultiple) cardinality = 'N:N';
  logger.item(
    `${field.slug} — materializado (${linksEnsured} links, ${cardinality})`,
  );
  return 'materialized';
}

// Passo 1: reconstrói links de definitions já materializadas a partir do
// embedded sobrevivente em `row[source.field.slug]` (caso `tarefas`).
// Só processa N:N (ambos os lados múltiplos): definitions 1:1/1:N já foram
// convertidas para FK inline pela migration 17 — recriar links desfaria esse
// trabalho e apagaria as FKs das rows.
async function backfillExistingDefinitions(
  systemDb: mongoose.mongo.Db,
  dataDb: mongoose.mongo.Db,
  now: Date,
  logger: TaskLogger,
): Promise<{ rebuilt: number; failed: number }> {
  const defsCol = systemDb.collection<DefinitionDoc>(
    'relationship-definitions',
  );
  const fieldsCol = systemDb.collection<FieldDoc>('fields');
  const linksCol = systemDb.collection('relationship-links');

  const definitions = await defsCol.find({ trashed: { $ne: true } }).toArray();

  let rebuilt = 0;
  let failed = 0;
  for (const definition of definitions) {
    const sourceSlug = definition.source?.table?.slug;
    const fieldSlug = definition.source?.field?.slug;
    if (!sourceSlug || !fieldSlug) continue;

    // Só N:N — OWNS_FK/REVERSE já convertidos pela migration 17 para FK inline
    const sourceFieldId = definition.source?.field?._id;
    const targetFieldId = definition.target?.field?._id;
    if (!sourceFieldId || !targetFieldId) continue;
    const sourceField = await fieldsCol.findOne(
      { _id: sourceFieldId },
      { projection: { multiple: 1 } },
    );
    const targetField = await fieldsCol.findOne(
      { _id: targetFieldId },
      { projection: { multiple: 1 } },
    );
    const isNtoN =
      sourceField?.multiple === true && targetField?.multiple === true;
    if (!isNtoN) continue;

    const { linksEnsured, failedRows } = await backfillLinksFromEmbedded(
      dataDb,
      linksCol,
      sourceSlug,
      fieldSlug,
      definition._id,
      now,
    );

    let suffix = '';
    if (failedRows > 0) suffix = `, ${failedRows} divergências`;
    if (linksEnsured > 0 || failedRows > 0) {
      logger.item(
        `${sourceSlug}.${fieldSlug} — ${linksEnsured} links reconstruídos${suffix}`,
      );
    }
    if (linksEnsured > 0 && failedRows === 0) rebuilt++;
    if (failedRows > 0) failed++;
  }

  return { rebuilt, failed };
}

runMigration({
  title: TITLE,
  marker: 'MIGRATION_RELATIONSHIP_REPAIR_AT',
  withDataConnection: true,
  async run({ db, dataDb: rawDataDb, logger }): Promise<MigrationOutcome> {
    const systemDb = db;
    const dataDb = rawDataDb!;

    const now = new Date();

    // Passo 1: backfill de links em definitions já materializadas (dado embedded
    // sobreviveu mas links ficaram vazios) — caso tarefas/release.
    const back = await backfillExistingDefinitions(
      systemDb,
      dataDb,
      now,
      logger,
    );

    // Passo 2: campos não-materializados ou ainda em grupo (fecha o vão 14/15).
    const fieldsCol = systemDb.collection<FieldDoc>('fields');
    const stuck = await fieldsCol
      .find({
        type: 'RELATIONSHIP',
        trashed: { $ne: true },
        $or: [
          { 'relationship.relationshipId': null },
          { 'relationship.relationshipId': { $exists: false } },
          { group: { $ne: null } },
        ],
      })
      .toArray();

    let materialized = 0;
    let orphaned = 0;
    let failed = back.failed;

    for (const field of stuck) {
      if (field.group !== null && field.group !== undefined) {
        await liftFromGroup(systemDb, dataDb, field, logger);
        field.group = null;
      }

      const result = await materializeField(
        systemDb,
        dataDb,
        field,
        now,
        logger,
      );
      if (result === 'materialized') materialized++;
      if (result === 'failed') failed++;
      if (result === 'orphan') {
        await quarantineOrphan(systemDb, field, now, logger);
        orphaned++;
      }
      if (result === 'deleted') orphaned++;
    }

    return {
      summary:
        `${back.rebuilt} definitions com links reconstruídos, ` +
        `${materialized} campos materializados, ${orphaned} órfãos isolados, ` +
        `${failed} com divergência`,
      // Marker só quando nada divergiu — pendentes reprocessam no próximo boot.
      keepPending: failed > 0,
    };
  },
}).catch((error: unknown): never => reportMigrationFailure(TITLE, error));
