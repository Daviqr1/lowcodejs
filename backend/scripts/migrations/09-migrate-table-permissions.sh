#!/bin/sh
# Migration: table-permissions
# Backfilla o novo modelo de permissoes (binding por acao + members) a partir da
# visibility/owner/administrators legados. Idempotente: skip se marker setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "09-migrate-table-permissions" "$@"
