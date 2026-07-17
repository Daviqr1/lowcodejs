#!/bin/sh
# Migration: relationship-cleanup-broken-definitions
# Quarentena campos espelho cujas RelationshipDefinitions referenciam tabelas
# inexistentes (gerados antes da correção do cleanupTable). Idempotente via
# marker MIGRATION_RELATIONSHIP_BROKEN_DEFINITIONS_AT. Repassa "$@" ao node.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "26-migrate-relationship-cleanup-broken-definitions" "$@"
