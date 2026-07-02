#!/bin/sh
# Migration: row-access-guard
# Marcadora (no-op): o controle de acesso por linha (visibility por grupo,
# creator-bypass, janela temporal) é avaliado em runtime e o campo de visibilidade
# + backfill das rows acontecem no bind-time (onTableBound), de forma idempotente.
# Não há backfill standalone aqui. Registra o marker MIGRATION_ROW_ACCESS_GUARD_AT
# só para manter a trilha de versão completa.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "22-migrate-row-access-guard" "$@"
