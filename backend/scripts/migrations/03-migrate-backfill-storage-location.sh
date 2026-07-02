#!/bin/sh
# Migration: backfill-storage-location
# Popula o campo `location` e `migration_status` em todos os docs Storage
# que não os possuem. Necessário após a feature de storage-migration.
# Idempotente: skip se marker MIGRATION_STORAGE_LOCATION_AT já setado.
set -e
. "$(dirname "$0")/_lib.sh"
# Desativado: o backfill roda pela própria feature de storage-migration.
# Não reative sem confirmar que a feature não cobre o backfill.
# run_migration "03-migrate-backfill-storage-location" "$@"
