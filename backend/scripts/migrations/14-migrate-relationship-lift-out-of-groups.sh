#!/bin/sh
# Migration: relationship-lift-out-of-groups
# Promove campos RELATIONSHIP aninhados em FIELD_GROUP para o nível top-level da
# tabela (RELATIONSHIP é sempre top-level, §2), unindo (dedup) o dado dos itens
# do grupo num array top-level. Roda ANTES da conversão embedded→links (15).
# Idempotente: skip se marker MIGRATION_RELATIONSHIP_LIFT_OUT_AT setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "14-migrate-relationship-lift-out-of-groups" "$@"
