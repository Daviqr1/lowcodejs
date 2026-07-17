#!/bin/sh
# Migration: dual-connection
# Copia collections dinâmicas do DB system (DB_DATABASE) para o DB data (DB_DATA_DATABASE).
# Habilita o split em 2 conexões Mongoose (system + data).
# Idempotente: skip se marker MIGRATION_DUAL_CONNECTION_AT já setado no Setting.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "01-migrate-dual-connection" "$@"
