/**
 * Migration: row-access guard (marcadora / no-op).
 *
 * O controle de acesso por linha é avaliado em runtime pelo RowAccessGuardService
 * (visibility por grupo, creator-bypass, janela temporal). O campo de visibilidade
 * (DROPDOWN) e o backfill das rows existentes são criados no bind-time
 * (`onTableBound`, idempotente via `$exists: false`) — não há backfill standalone.
 *
 * Esta migration apenas registra o marker para manter a trilha de versão completa.
 *
 * Idempotente via marker no Setting singleton:
 *   - MIGRATION_ROW_ACCESS_GUARD_AT
 *
 * Usage:
 *   Dev: node --import @swc-node/register/esm-register database/migrations/migrate-row-access-guard.ts
 *   Prod: node database/migrations/migrate-row-access-guard.js
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'Guard de acesso por linha';

type SettingMarkerDoc = {
  MIGRATION_ROW_ACCESS_GUARD_AT?: Date | null;
};

async function migrate(): Promise<void> {
  const logger = new TaskLogger(TITLE);

  if (!DATABASE_URL) {
    logger.failed('DATABASE_URL não configurada');
    process.exit(1);
  }

  const conn = mongoose.createConnection(DATABASE_URL, { dbName: DB_DATABASE });
  await conn.asPromise();

  const SettingMarkerSchema = new mongoose.Schema(
    { MIGRATION_ROW_ACCESS_GUARD_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarkerRowAccessGuard',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_ROW_ACCESS_GUARD_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    logger.done('nada a migrar — enforcement em runtime + bind-time');

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_ROW_ACCESS_GUARD_AT: new Date() } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } finally {
    await conn.close();
  }
}

migrate().catch((error: unknown): void => {
  new TaskLogger(TITLE).failed(error);
  process.exit(1);
});
