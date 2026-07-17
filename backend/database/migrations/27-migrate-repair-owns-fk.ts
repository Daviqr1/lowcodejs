/**
 * Migration: repara FKs inline de relacionamentos OWNS_FK removidas pela migration 23.
 *
 * A migration 23 (`backfillExistingDefinitions`) processava *todas* as
 * definitions, incluindo as que a migration 17 já havia convertido de links →
 * FK inline. Para cada row com `row[fieldSlug]` preenchido, a 23 criava um
 * link e fazia `$unset { [fieldSlug]: '' }` — apagando a FK.
 *
 * Esta migration inverte esse efeito para definitions OWNS_FK (não N:N):
 *   1. Para cada definition não-trashed onde existem links E é OWNS_FK:
 *      a. Determina o lado dono (lado não-múltiplo; source por convenção no 1:1).
 *      b. Para cada link: se a row do dono não tem FK, restaura
 *         `$set: { [ownerFieldSlug]: otherId }`.
 *      c. Após restaurar: apaga os links da definition
 *         (OWNS_FK não usa links — FK é a única fonte de verdade).
 *   2. N:N (ambos múltiplos) é pulado — links são corretos.
 *
 * Idempotente: se os links já foram deletados ou a FK já foi restaurada, o
 * loop é no-op por definition. Marker grava ao final se nenhuma definition
 * divergiu.
 *
 * Idempotente via marker no Setting singleton:
 *   MIGRATION_REPAIR_OWNS_FK_AT
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/27-migrate-repair-owns-fk.ts
 *   (boot Docker roda via scripts/migrations/27-migrate-repair-owns-fk.sh)
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name (fields, tables, relationship-*)
 *   DB_DATA_DATABASE - Data database name (dynamic row collections)
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const DB_DATA_DATABASE = process.env.DB_DATA_DATABASE || 'lowcodejs_data';
const FORCE = process.argv.includes('--force');
const TITLE = 'Reparo de FKs inline (OWNS_FK) apagadas pela migration 23';

type SettingMarkerDoc = {
  MIGRATION_REPAIR_OWNS_FK_AT?: Date | null;
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

async function repairDefinition(
  systemDb: mongoose.mongo.Db,
  dataDb: mongoose.mongo.Db,
  def: DefDoc,
  logger: TaskLogger,
): Promise<'repaired' | 'skipped' | 'noop'> {
  const fieldsCol = systemDb.collection<FieldDoc>('fields');
  const linksCol = systemDb.collection<LinkDoc>('relationship-links');

  const sourceField = await fieldsCol.findOne({ _id: def.source.field._id });
  const targetField = await fieldsCol.findOne({ _id: def.target.field._id });
  const sourceMultiple = Boolean(sourceField?.multiple);
  const targetMultiple = Boolean(targetField?.multiple);

  // N:N: links são corretos, pular
  if (sourceMultiple && targetMultiple) return 'skipped';

  const linkCount = await linksCol.countDocuments({ relationshipId: def._id });
  if (linkCount === 0) return 'noop';

  // Lado dono: não-múltiplo (1:N); source por convenção no 1:1
  let ownerSide: Side = 'source';
  if (sourceMultiple && !targetMultiple) ownerSide = 'target';

  let ownerEndpoint = def.source;
  if (ownerSide === 'target') ownerEndpoint = def.target;
  const ownerFieldSlug = ownerEndpoint.field.slug;
  const ownerCol = dataDb.collection(ownerEndpoint.table.slug);

  const links = await linksCol.find({ relationshipId: def._id }).toArray();
  let restored = 0;

  for (const link of links) {
    let ownerRowId = link.sourceId;
    if (ownerSide === 'target') ownerRowId = link.targetId;
    let otherId = link.targetId;
    if (ownerSide === 'target') otherId = link.sourceId;

    const ownerRow = await ownerCol.findOne(
      { _id: ownerRowId },
      { projection: { [ownerFieldSlug]: 1 } },
    );
    if (!ownerRow) continue;
    if (ownerRow[ownerFieldSlug]) continue; // FK já existe

    await ownerCol.updateOne(
      { _id: ownerRowId },
      { $set: { [ownerFieldSlug]: otherId } },
    );
    restored++;
  }

  await linksCol.deleteMany({ relationshipId: def._id });

  logger.item(
    `${ownerEndpoint.table.slug}.${ownerFieldSlug}: ${restored} FKs restauradas, ${links.length} links removidos`,
  );
  return 'repaired';
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
    { MIGRATION_REPAIR_OWNS_FK_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = systemConn.model<SettingMarkerDoc>(
    'SettingMarkerRepairOwnsFk',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_REPAIR_OWNS_FK_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();

    const defsCol = systemDb.collection<DefDoc>('relationship-definitions');
    const defs = await defsCol.find({ trashed: { $ne: true } }).toArray();

    let repaired = 0;
    let skipped = 0;
    let noop = 0;

    for (const def of defs) {
      const result = await repairDefinition(systemDb, dataDb, def, logger);
      if (result === 'repaired') repaired++;
      if (result === 'skipped') skipped++;
      if (result === 'noop') noop++;
    }

    logger.done(
      `${repaired} definitions reparadas, ${skipped} N:N mantidas, ${noop} sem links (já ok)`,
    );

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_REPAIR_OWNS_FK_AT: new Date() } },
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
