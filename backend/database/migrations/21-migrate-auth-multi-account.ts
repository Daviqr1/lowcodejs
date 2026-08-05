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

import { runMigration } from '../shared/migration-runner';

const TITLE = 'Sessões multi-conta';

await runMigration({
  title: TITLE,
  marker: 'MIGRATION_AUTH_MULTI_ACCOUNT_AT',
  async run(): Promise<string> {
    return 'nada a migrar — multi-conta é cookie-only';
  },
});
