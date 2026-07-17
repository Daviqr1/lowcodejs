/**
 * Migration: backfill do espelho denormalizado (`relationship.mirror`) em
 * campos RELATIONSHIP.
 *
 * `RelationshipStorage.roleOfField` deriva o papel de armazenamento (OWNS_FK /
 * REVERSE / PIVOT) a partir de `field.relationship.mirror.multiple` (o
 * `multiple` do campo do lado oposto). Sem esse espelho, `roleOfField` retorna
 * `null` e leitura/escrita/schema da row caem no fallback legado (pivô), o que
 * diverge da família de endpoints `/links` (que usa `isPivot` lido do DB) —
 * relacionamentos 1:1/1:N ficam inconsistentes (dado no pivô, tela lê FK).
 *
 * Para cada `relationship-definitions`, lê os dois campos endpoint e grava em
 * cada um o `relationship.mirror` do lado OPOSTO:
 *   - source.relationship.mirror = { multiple, visible, label } do target
 *   - target.relationship.mirror = { multiple, visible, label } do source
 * `multiple` vem do campo (fonte de verdade da cardinalidade); `visible`/`label`
 * vêm da endpoint da definition. Derivado — reescreve de forma idempotente.
 *
 * Roda DEPOIS da 16 (endpoint flags) e da 17 (links→FK). Idempotente via marker
 * no Setting singleton:
 *   MIGRATION_RELATIONSHIP_MIRROR_AT
 *
 * Usage:
 *   node --import @swc-node/register/esm-register \
 *     database/migrations/migrate-backfill-relationship-mirror.ts
 *   (com --force re-executa ignorando o marker)
 *
 * Environment variables required:
 *   DATABASE_URL - MongoDB connection string
 *   DB_DATABASE  - System database name (fields, relationship-definitions)
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'Backfill do espelho denormalizado (relationship.mirror)';

type SettingMarkerDoc = {
  MIGRATION_RELATIONSHIP_MIRROR_AT?: Date | null;
};

type ObjectId = mongoose.Types.ObjectId;

type FieldDoc = {
  _id: ObjectId;
  name?: string;
  multiple?: boolean;
};

type Endpoint = {
  table: { _id: ObjectId; slug: string };
  field: { _id: ObjectId; slug: string };
  visible?: boolean;
  label?: string;
};

type DefDoc = {
  _id: ObjectId;
  name?: string;
  source: Endpoint;
  target: Endpoint;
};

type MirrorFragment = {
  multiple: boolean;
  visible: boolean;
  label: string | null;
};

// Espelho do lado oposto: cardinalidade vem do campo (autoritativo); visible da
// endpoint da definition; label do nome do campo (fallback para o label da
// endpoint). `field` ausente (def órfã) devolve null — pulada pelo caller.
function mirrorOf(
  oppositeField: FieldDoc | null,
  oppositeEndpoint: Endpoint,
): MirrorFragment | null {
  if (!oppositeField) return null;
  let label = oppositeField.name ?? null;
  if (!label) label = oppositeEndpoint.label ?? null;
  return {
    multiple: Boolean(oppositeField.multiple),
    visible: Boolean(oppositeEndpoint.visible),
    label,
  };
}

async function backfillMirror(systemDb: mongoose.mongo.Db): Promise<number> {
  const fieldsCol = systemDb.collection<FieldDoc>('fields');
  const defsCol = systemDb.collection<DefDoc>('relationship-definitions');

  const defs = await defsCol.find({}).toArray();
  let updated = 0;

  for (const def of defs) {
    const sourceField = await fieldsCol.findOne({ _id: def.source.field._id });
    const targetField = await fieldsCol.findOne({ _id: def.target.field._id });

    const sourceMirror = mirrorOf(targetField, def.target);
    if (sourceMirror) {
      await fieldsCol.updateOne(
        { _id: def.source.field._id },
        { $set: { 'relationship.mirror': sourceMirror } },
      );
      updated++;
    }

    const targetMirror = mirrorOf(sourceField, def.source);
    if (targetMirror) {
      await fieldsCol.updateOne(
        { _id: def.target.field._id },
        { $set: { 'relationship.mirror': targetMirror } },
      );
      updated++;
    }
  }

  return updated;
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
  const systemDb = systemConn.db!;

  const SettingMarkerSchema = new mongoose.Schema(
    { MIGRATION_RELATIONSHIP_MIRROR_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = systemConn.model<SettingMarkerDoc>(
    'SettingMarkerRelMirror',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_RELATIONSHIP_MIRROR_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const updated = await backfillMirror(systemDb);
    logger.done(`${updated} campo(s) com relationship.mirror preenchido`);

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_RELATIONSHIP_MIRROR_AT: new Date() } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } finally {
    await systemConn.close();
  }
}

migrate().catch((error: unknown): void => {
  new TaskLogger(TITLE).failed(error);
  process.exit(1);
});
