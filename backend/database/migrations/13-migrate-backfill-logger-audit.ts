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

import mongoose from 'mongoose';

import LoggerAuditService from '../../application/services/logger-audit/logger-audit.service';
import { runMigration } from '../shared/migration-runner';

// Migration roda fora do container de DI. As conexoes chegam por parametro
// de metodo, entao o service nao precisa de nada no constructor.
const loggerAudit = new LoggerAuditService();

const TITLE = 'Backfill de auditoria dos logs';

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

    const audit = await loggerAudit.resolve({
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

await runMigration({
  title: TITLE,
  marker: 'MIGRATION_LOGGER_AUDIT_AT',
  withDataConnection: true,
  async run({ db, dataDb: rawDataDb }): Promise<string> {
    const systemDb = db;
    const dataDb = rawDataDb!;

    const result = await backfillLoggerAudit(systemDb, dataDb);

    return `${result.scanned} logs de ROW lidos, ${result.updated} atualizados`;
  },
});
