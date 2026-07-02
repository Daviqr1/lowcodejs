/**
 * Migration: backfill das flags de endpoint em campos RELATIONSHIP.
 *
 * Garante `visible` (em `relationship.visible`) e `side`
 * (`relationship.side` = 'source'|'target') em todo campo RELATIONSHIP que
 * ainda não os tenha — sem sobrescrever valores existentes e sem tocar em
 * `multiple` (que já existe) nem em `relationshipId` (preenchido pela
 * migration 15). `side` é derivado comparando o `_id` do campo com
 * `definition.source.field._id` (igual → 'source', senão 'target'); a tela de
 * detalhe usa `side` para chamar os endpoints `/links`. Rede de segurança para
 * campos que a 15 não cobriu.
 *
 * Antes do assert de fechamento, remove Field RELATIONSHIP órfão: `group: null`,
 * sem `relationshipId` e fora de `table.fields` e `table.groups[].fields`. Esse
 * campo nunca será materializado por nenhuma migration (15/23 o pulam com
 * "tabela source não encontrada") — é lixo de rename/remoção que travaria o
 * gate eternamente. Apagá-lo permite o boot se auto-curar. Campos ainda
 * recuperáveis (em `table.fields` sem `relationshipId`, ou em grupo) NÃO são
 * tocados — continuam dando hard-fail até o remodel manual.
 *
 * Idempotente via marker no Setting singleton:
 *   MIGRATION_RELATIONSHIP_ENDPOINT_FLAGS_AT
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/16-migrate-backfill-relationship-endpoint-flags.ts
 *   node --import @swc-node/register/esm-register database/migrations/16-migrate-backfill-relationship-endpoint-flags.ts -- --force
 *   (no boot Docker roda via scripts/migrations/16-migrate-backfill-relationship-endpoint-flags.sh)
 *
 * Environment variables required:
 *   DATABASE_URL - MongoDB connection string
 *   DB_DATABASE  - System database name (fields)
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'Backfill de flags de endpoint (relationship)';

type SettingMarkerDoc = {
  MIGRATION_RELATIONSHIP_ENDPOINT_FLAGS_AT?: Date | null;
};

async function backfillSide(systemDb: mongoose.mongo.Db): Promise<number> {
  const fieldsCol = systemDb.collection('fields');
  const defsCol = systemDb.collection('relationship-definitions');

  // Mapa relationshipId -> _id do campo source (lado declarante da definition).
  const defs = await defsCol.find({}).toArray();
  const sourceFieldByDefinition = new Map<string, string>();
  for (const def of defs) {
    const sourceFieldId = def.source?.field?._id;
    if (sourceFieldId) {
      sourceFieldByDefinition.set(String(def._id), String(sourceFieldId));
    }
  }

  const pending = await fieldsCol
    .find({
      type: 'RELATIONSHIP',
      'relationship.relationshipId': { $ne: null },
      'relationship.side': { $exists: false },
    })
    .toArray();

  let updated = 0;
  for (const field of pending) {
    const relationshipId = field.relationship?.relationshipId;
    if (!relationshipId) continue;

    const sourceFieldId = sourceFieldByDefinition.get(String(relationshipId));
    if (!sourceFieldId) continue;

    let side = 'target';
    if (String(field._id) === sourceFieldId) side = 'source';

    await fieldsCol.updateOne(
      { _id: field._id },
      { $set: { 'relationship.side': side } },
    );
    updated++;
  }

  return updated;
}

// Remove Field RELATIONSHIP órfão antes do assert: `group: null`, sem
// `relationshipId` e não referenciado por nenhuma `table.fields` nem
// `table.groups[].fields`. É lixo irrecuperável (rename/remoção) que travaria o
// gate eternamente. Self-verifying: só apaga o que confirmar sem referência.
async function pruneOrphanRelationshipFields(
  systemDb: mongoose.mongo.Db,
): Promise<number> {
  const fieldsCol = systemDb.collection('fields');
  const tablesCol = systemDb.collection('tables');

  const candidates = await fieldsCol
    .find({
      type: 'RELATIONSHIP',
      group: null,
      $or: [
        { 'relationship.relationshipId': null },
        { 'relationship.relationshipId': { $exists: false } },
      ],
    })
    .toArray();

  type OrphanId = (typeof candidates)[number]['_id'];
  const orphanIds: OrphanId[] = [];
  for (const field of candidates) {
    const inFields = await tablesCol.findOne(
      { fields: field._id },
      { projection: { _id: 1 } },
    );
    if (inFields) continue;

    const inGroups = await tablesCol.findOne(
      { 'groups.fields': field._id },
      { projection: { _id: 1 } },
    );
    if (inGroups) continue;

    orphanIds.push(field._id);
  }

  if (orphanIds.length === 0) return 0;

  const result = await fieldsCol.deleteMany({ _id: { $in: orphanIds } });
  return result.deletedCount ?? 0;
}

// Assert de fechamento (zero legado): nenhum campo RELATIONSHIP pode sobrar sem
// `relationshipId` (não materializado) nem com `group` (aninhado em FIELD_GROUP).
// Enquanto houver pendência, o marker NÃO é gravado — a migration reprocessa no
// próximo boot e o sinal fica visível para o operador rodar o remodel manual
// (`migrate:fieldgroup-to-relationship`) ou a `migrate:relationship`.
async function countUnmaterialized(
  systemDb: mongoose.mongo.Db,
): Promise<number> {
  const fieldsCol = systemDb.collection('fields');
  return fieldsCol.countDocuments({
    type: 'RELATIONSHIP',
    $or: [
      { 'relationship.relationshipId': null },
      { 'relationship.relationshipId': { $exists: false } },
      { group: { $ne: null } },
    ],
  });
}

async function backfillFlags(
  systemDb: mongoose.mongo.Db,
): Promise<{ visibleRel: number; sideRel: number; formModeRel: number }> {
  const fieldsCol = systemDb.collection('fields');

  // `visible` vive em `relationship.visible` (sub-schema), não no nível do campo.
  const visibleRel = await fieldsCol.updateMany(
    {
      type: 'RELATIONSHIP',
      relationship: { $ne: null },
      'relationship.visible': { $exists: false },
    },
    { $set: { 'relationship.visible': true } },
  );

  // `formMode` ausente = comportamento histórico (multi-select de vínculo
  // direto). Backfilla explícito como 'select' para não depender do default.
  const formModeRel = await fieldsCol.updateMany(
    {
      type: 'RELATIONSHIP',
      relationship: { $ne: null },
      'relationship.formMode': { $exists: false },
    },
    { $set: { 'relationship.formMode': 'select' } },
  );

  const sideRel = await backfillSide(systemDb);

  return {
    visibleRel: visibleRel.modifiedCount ?? 0,
    sideRel,
    formModeRel: formModeRel.modifiedCount ?? 0,
  };
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
    { MIGRATION_RELATIONSHIP_ENDPOINT_FLAGS_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = systemConn.model<SettingMarkerDoc>(
    'SettingMarkerRelEndpointFlags',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_RELATIONSHIP_ENDPOINT_FLAGS_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await backfillFlags(systemDb);
    logger.done(
      `${result.visibleRel} relationship.visible, ${result.sideRel} relationship.side e ${result.formModeRel} relationship.formMode preenchidos`,
    );

    const pruned = await pruneOrphanRelationshipFields(systemDb);
    if (pruned > 0) {
      logger.item(`${pruned} campo(s) RELATIONSHIP órfão(s) removido(s)`);
    }

    const unmaterialized = await countUnmaterialized(systemDb);
    if (unmaterialized > 0) {
      logger.failed(
        `${unmaterialized} campo(s) RELATIONSHIP ainda sem relationshipId ou dentro de grupo. ` +
          `Marker NÃO gravado (reprocessa no próximo boot). Para rodar à mão, execute em ordem ` +
          `scripts/migrations/14, 15 e 16 (ex.: "sh scripts/migrations/16-migrate-backfill-relationship-endpoint-flags.sh --force"); ` +
          `e, para FIELD_GROUP usado como falso-relacionamento, ` +
          `"node --import @swc-node/register/esm-register database/migrations/migrate-fieldgroup-to-relationship.ts --table=<slug> --group=<id|slug> --apply --i-have-backup".`,
      );
      return;
    }

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_RELATIONSHIP_ENDPOINT_FLAGS_AT: new Date() } },
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
