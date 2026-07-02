#!/bin/sh
# Migration: relationship-table-id
# Backfilla relationship.table._id em Field docs do tipo RELATIONSHIP onde
# o _id está ausente. Garante que refs de relacionamento sejam slug-independentes.
# Idempotente: skip se marker MIGRATION_RELATIONSHIP_TABLE_ID_AT já setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "06-migrate-relationship-table-id" "$@"
