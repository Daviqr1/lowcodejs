#!/bin/sh
# Migration: backfill-row-slugs
# Gera sharedRowSlug para registros antigos de tabelas com rowSlugFieldId
# configurado, habilitando a URL amigável (/tables/:slug/:rowSlug) nos registros
# retroativos. Idempotente: skip se marker MIGRATION_ROW_SLUG_BACKFILL_AT setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "08-migrate-backfill-row-slugs" "$@"
