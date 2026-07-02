/**
 * Migration: converte vínculos (RelationshipLink) de relacionamentos **1:1 e
 * 1:N** para FK single inline na própria row (modelo FK-inline). N:N permanece
 * no pivô (links preservados).
 *
 * Para cada RelationshipDefinition:
 *  1. Deriva a cardinalidade dos dois campos (`multiple`). N:N → pulado.
 *  2. Determina o lado dono da FK (OWNS_FK): o lado não-múltiplo (1:N) ou o
 *     source por convenção (1:1).
 *  3. Mapeia cada link → `ownerRow[ownerFieldSlug] = otherId` (FK single).
 *     Detecta conflito (mesmo owner apontando p/ >1 outro = perda de dado): se
 *     houver, **falha** a definition (mantém links, não grava marker).
 *  4. Escreve as FKs nas rows do dono (colação data).
 *  5. Remove os links dessa definition (`deleteMany`).
 *  6. Ajusta o `_schema` do dono p/ path single FK (lado reverso segue array
 *     transiente). Owner rows ausentes (links órfãos) são tolerados e logados.
 *
 * Idempotente: 2ª execução acha 0 links (já removidos) — no-op por definition;
 * o `_schema` é reescrito de forma idempotente. Marker só grava se nenhuma
 * definition divergir (conflito).
 *
 * Idempotente via marker no Setting singleton:
 *   MIGRATION_RELATIONSHIP_LINKS_TO_FK_AT
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/17-migrate-relationship-links-to-fk.ts
 *   node --import @swc-node/register/esm-register database/migrations/17-migrate-relationship-links-to-fk.ts -- --force
 *   (no boot Docker roda via scripts/migrations/17-migrate-relationship-links-to-fk.sh)
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name (fields, tables, relationship-*)
 *   DB_DATA_DATABASE - Data database name (dynamic row collections)
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { E_SCHEMA_TYPE } from '../../application/core/entity.core';
import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const DB_DATA_DATABASE = process.env.DB_DATA_DATABASE || 'lowcodejs_data';
const FORCE = process.argv.includes('--force');
const TITLE = 'Relacionamentos links → FK (1:1/1:N)';

type SettingMarkerDoc = {
  MIGRATION_RELATIONSHIP_LINKS_TO_FK_AT?: Date | null;
};

type ObjectId = mongoose.Types.ObjectId;

type FieldDoc = {
  _id: ObjectId;
  multiple?: boolean;
};

type Endpoint = {
  table: { _id: ObjectId; slug: string };
  field: { _id: ObjectId; slug: string };
};

type DefDoc = {
  _id: ObjectId;
  name?: string;
  source: Endpoint;
  target: Endpoint;
};

type LinkDoc = {
  _id: ObjectId;
  relationshipId: ObjectId;
  sourceId: ObjectId;
  targetId: ObjectId;
};

type Side = 'source' | 'target';
type Outcome = 'migrated' | 'skipped' | 'failed';

// Fragmento de _schema do lado OWNS_FK: ObjectId single (não array) com ref para
// a tabela apontada — espelha o MongooseSchemaBuilder no role OWNS_FK.
function ownerSchemaFragment(refTableId: ObjectId): unknown {
  return {
    type: E_SCHEMA_TYPE.OBJECT_ID,
    required: false,
    ref: refTableId.toString(),
  };
}

async function migrateDefinition(
  systemDb: mongoose.mongo.Db,
  dataDb: mongoose.mongo.Db,
  def: DefDoc,
  logger: TaskLogger,
): Promise<Outcome> {
  const fieldsCol = systemDb.collection<FieldDoc>('fields');
  const tablesCol = systemDb.collection('tables');
  const linksCol = systemDb.collection<LinkDoc>('relationship-links');

  const sourceField = await fieldsCol.findOne({ _id: def.source.field._id });
  const targetField = await fieldsCol.findOne({ _id: def.target.field._id });
  const sourceMultiple = Boolean(sourceField?.multiple);
  const targetMultiple = Boolean(targetField?.multiple);

  // N:N (os dois múltiplos) permanece no pivô — não converte.
  if (sourceMultiple && targetMultiple) {
    logger.item(`${def.name ?? def._id} — N:N, mantém pivô`);
    return 'skipped';
  }

  // Lado dono da FK: o não-múltiplo (1:N); source por convenção no 1:1.
  let ownerSide: Side = 'source';
  if (sourceMultiple && !targetMultiple) ownerSide = 'target';

  let ownerEndpoint = def.source;
  let otherEndpoint = def.target;
  if (ownerSide === 'target') {
    ownerEndpoint = def.target;
    otherEndpoint = def.source;
  }

  const ownerSlug = ownerEndpoint.table.slug;
  const ownerFieldSlug = ownerEndpoint.field.slug;
  const otherTableId = otherEndpoint.table._id;

  const links = await linksCol.find({ relationshipId: def._id }).toArray();

  // ownerRowId -> otherId (FK single). Conflito = owner com >1 alvo (perda).
  const fkByOwner = new Map<string, ObjectId>();
  for (const link of links) {
    let ownerRowId = link.sourceId;
    let otherId = link.targetId;
    if (ownerSide === 'target') {
      ownerRowId = link.targetId;
      otherId = link.sourceId;
    }

    const key = ownerRowId.toString();
    const existing = fkByOwner.get(key);
    if (existing && existing.toString() !== otherId.toString()) {
      logger.item(
        `${def.name ?? def._id} — conflito: owner ${key} aponta p/ >1 alvo (mantém links)`,
      );
      return 'failed';
    }
    fkByOwner.set(key, otherId);
  }

  // Escreve a FK single nas rows do dono (colação data).
  const ownerCol = dataDb.collection(ownerSlug);
  let written = 0;
  let orphan = 0;
  for (const [ownerRowId, otherId] of fkByOwner) {
    const result = await ownerCol.updateOne(
      { _id: new mongoose.Types.ObjectId(ownerRowId) },
      { $set: { [ownerFieldSlug]: otherId } },
    );
    if (result.matchedCount > 0) written++;
    if (result.matchedCount === 0) orphan++;
  }

  // Remove os links desta definition (1:1/1:N não usam mais pivô).
  await linksCol.deleteMany({ relationshipId: def._id });

  // _schema do dono: path single FK (ref para a tabela apontada).
  await tablesCol.updateOne(
    { _id: ownerEndpoint.table._id },
    {
      $set: {
        [`_schema.${ownerFieldSlug}`]: ownerSchemaFragment(otherTableId),
      },
    },
  );

  let cardinality = '1:N';
  if (!sourceMultiple && !targetMultiple) cardinality = '1:1';
  logger.item(
    `${def.name ?? def._id} — ${cardinality}: ${written} FK escritas, ${orphan} órfãs, ${links.length} links removidos`,
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
      MIGRATION_RELATIONSHIP_LINKS_TO_FK_AT: {
        type: Date,
        default: null,
      },
    },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = systemConn.model<SettingMarkerDoc>(
    'SettingMarkerRelLinksToFk',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_RELATIONSHIP_LINKS_TO_FK_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();

    const defsCol = systemDb.collection<DefDoc>('relationship-definitions');
    const defs = await defsCol.find({}).toArray();

    let migrated = 0;
    let skipped = 0;
    let failed = 0;
    for (const def of defs) {
      const result = await migrateDefinition(systemDb, dataDb, def, logger);
      if (result === 'migrated') migrated++;
      if (result === 'skipped') skipped++;
      if (result === 'failed') failed++;
    }

    logger.done(
      `${migrated} convertidos, ${skipped} N:N mantidos, ${failed} com conflito`,
    );

    // Marker só quando nenhuma definition divergiu — pendentes reprocessam.
    if (failed === 0) {
      await SettingMarker.findOneAndUpdate(
        {},
        { $set: { MIGRATION_RELATIONSHIP_LINKS_TO_FK_AT: new Date() } },
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
