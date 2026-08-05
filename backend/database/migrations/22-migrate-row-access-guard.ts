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

import { runMigration } from '../shared/migration-runner';

const TITLE = 'Guard de acesso por linha';

await runMigration({
  title: TITLE,
  marker: 'MIGRATION_ROW_ACCESS_GUARD_AT',
  async run(): Promise<string> {
    return 'nada a migrar — enforcement em runtime + bind-time';
  },
});
