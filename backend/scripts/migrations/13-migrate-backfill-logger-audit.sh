#!/bin/sh
# Migration: backfill-logger-audit
# Copia para os logs de ROW (/logs) os campos creator/updater/objectCreatedAt/
# objectUpdatedAt do registro referenciado, lidos das linhas de tabela dinamica.
# Idempotente via marker MIGRATION_LOGGER_AUDIT_AT no Setting singleton.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "13-migrate-backfill-logger-audit" "$@"
