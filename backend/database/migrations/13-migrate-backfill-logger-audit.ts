/**
 * Migration: Backfill dos campos do registro referenciado nos logs (/logs).
 *
 * O historico de acoes (collection `logs`) passou a exibir, por linha, dados do
 * REGISTRO referenciado (object_id): quem criou, quem modificou por ultimo, e
 * quando. Esses dados sao gravados no log no momento da escrita (logger.hook),
 * mas logs antigos nao os possuem.
 *
 * Esta migration percorre os logs de objeto ROW (ROWs de tabela dinamica tem os
 * campos CREATOR/UPDATER) e copia os valores atuais do registro para o log.
 * Logs de outros tipos de objeto ficam null. Idempotente: re-rodar produz o
 * mesmo resultado.
 *
 * Idempotente via marker no Setting singleton:
 *   MIGRATION_LOGGER_AUDIT_AT
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/13-migrate-backfill-logger-audit.ts            # backfill (skips if already migrated)
 *   node --import @swc-node/register/esm-register database/migrations/13-migrate-backfill-logger-audit.ts -- --force # re-run, ignoring marker
 *   (no boot Docker roda via scripts/migrations/13-migrate-backfill-logger-audit.sh)
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name (logs + tables)
 *   DB_DATA_DATABASE - Data database name (dynamic row collections)
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { resolveLoggerObjectAudit } from '../../application/core/logger/resolve-object-audit';
import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const DB_DATA_DATABASE = process.env.DB_DATA_DATABASE || 'lowcodejs_data';
const FORCE = process.argv.includes('--force');
const TITLE = 'Backfill de auditoria dos logs';

type SettingMarkerDoc = {
  MIGRATION_LOGGER_AUDIT_AT?: Date | null;
};

async function backfillLoggerAudit(
  systemDb: mongoose.mongo.Db,
  dataDb: mongoose.mongo.Db,
): Promise<{ scanned: number; updated: number }> {
  const logsCol = systemDb.collection('logs');

  // Apenas logs de ROW: unica fonte confiavel de creator/updater do objeto.
  const cursor = logsCol.find({ object: 'ROW' });

  let scanned = 0;
  let updated = 0;
  let batch: mongoose.mongo.AnyBulkWriteOperation[] = [];

  const flush = async (): Promise<void> => {
    if (batch.length === 0) return;
    const result = await logsCol.bulkWrite(batch);
    updated += result.modifiedCount ?? 0;
    batch = [];
  };

  for await (const log of cursor) {
    scanned++;

    const audit = await resolveLoggerObjectAudit({
      systemDb,
      dataDb,
      object: log.object ?? null,
      objectId: log.object_id ?? null,
      url: log.url ?? '',
    });

    // Sem fonte confiavel: nao toca no log (mantem null).
    if (
      !audit.creator &&
      !audit.updater &&
      !audit.objectCreatedAt &&
      !audit.objectUpdatedAt
    ) {
      continue;
    }

    batch.push({
      updateOne: {
        filter: { _id: log._id },
        update: {
          $set: {
            creator: audit.creator,
            updater: audit.updater,
            objectCreatedAt: audit.objectCreatedAt,
            objectUpdatedAt: audit.objectUpdatedAt,
          },
        },
      },
    });

    if (batch.length >= 500) await flush();
  }

  await flush();

  return { scanned, updated };
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
      MIGRATION_LOGGER_AUDIT_AT: { type: Date, default: null },
    },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = systemConn.model<SettingMarkerDoc>(
    'SettingMarker',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_LOGGER_AUDIT_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    const result = await backfillLoggerAudit(systemDb, dataDb);
    logger.done(
      `${result.scanned} logs de ROW lidos, ${result.updated} atualizados`,
    );

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_LOGGER_AUDIT_AT: new Date() } },
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
