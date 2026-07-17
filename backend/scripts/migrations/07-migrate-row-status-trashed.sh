#!/bin/sh
# Migration: row-status-trashed
# Backfilla status/draftAt e remove o boolean `trashed` das rows dinâmicas e
# itens de grupo no DB de dados. A lixeira passa a ser controlada só por
# trashedAt. Idempotente: skip se marker MIGRATION_ROW_STATUS_TRASHED_AT setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "07-migrate-row-status-trashed" "$@"
