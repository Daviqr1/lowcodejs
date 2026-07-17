/**
 * Migration: sessões multi-conta (marcadora / no-op).
 *
 * As sessões multi-conta são puramente baseadas em cookies indexados
 * (accessToken_<id> / refreshToken_<id> + activeAccountId) — nenhum campo novo
 * no model User nem coleção nova. Não há dado a migrar; sessões single-account
 * legadas continuam funcionando pelo fallback em cookies.util.ts.
 *
 * Esta migration apenas registra o marker para manter a trilha de versão completa.
 *
 * Idempotente via marker no Setting singleton:
 *   - MIGRATION_AUTH_MULTI_ACCOUNT_AT
 *
 * Usage:
 *   Dev: node --import @swc-node/register/esm-register database/migrations/migrate-auth-multi-account.ts
 *   Prod: node database/migrations/migrate-auth-multi-account.js
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const TITLE = 'Sessões multi-conta';

type SettingMarkerDoc = {
  MIGRATION_AUTH_MULTI_ACCOUNT_AT?: Date | null;
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
    { MIGRATION_AUTH_MULTI_ACCOUNT_AT: { type: Date, default: null } },
    { strict: false, collection: 'settings' },
  );
  const SettingMarker = conn.model<SettingMarkerDoc>(
    'SettingMarkerAuthMultiAccount',
    SettingMarkerSchema,
  );

  const setting = await SettingMarker.findOne({}).lean();

  try {
    const appliedAt = setting?.MIGRATION_AUTH_MULTI_ACCOUNT_AT;
    if (appliedAt && !FORCE) {
      logger.skipped(appliedAt);
      return;
    }

    logger.running();
    logger.done('nada a migrar — multi-conta é cookie-only');

    await SettingMarker.findOneAndUpdate(
      {},
      { $set: { MIGRATION_AUTH_MULTI_ACCOUNT_AT: new Date() } },
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
