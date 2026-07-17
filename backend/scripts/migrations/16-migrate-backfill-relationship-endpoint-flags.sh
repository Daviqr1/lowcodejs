#!/bin/sh
# Migration: backfill-relationship-endpoint-flags
# Garante a flag `visible` (top-level e em relationship.visible) em campos
# RELATIONSHIP que ainda não a tenham. Não toca multiple nem relationshipId.
# Idempotente: skip se marker MIGRATION_RELATIONSHIP_ENDPOINT_FLAGS_AT setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "16-migrate-backfill-relationship-endpoint-flags" "$@"
