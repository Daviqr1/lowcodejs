#!/bin/sh
# Migration: backfill-relationship-mirror
# Grava o espelho denormalizado `relationship.mirror` (multiple/visible/label do
# lado oposto) em campos RELATIONSHIP. Sem isto, roleOfField retorna null e a
# leitura/escrita da row cai no fallback legado (pivô), divergindo dos endpoints
# /links (FK-inline). Roda DEPOIS da 16 (endpoint flags) e 17 (links→FK).
# Idempotente: skip se marker MIGRATION_RELATIONSHIP_MIRROR_AT setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "18-migrate-backfill-relationship-mirror" "$@"
