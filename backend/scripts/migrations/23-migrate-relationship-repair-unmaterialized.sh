#!/bin/sh
# Migration: relationship-repair-unmaterialized
# Reconstrói links de relacionamentos FK-inline a partir do embedded sobrevivente
# (definition materializada com 0 links) e materializa campos RELATIONSHIP que
# caíram no vão das migrations 14/15 (group sem slug). Idempotente via marker
# MIGRATION_RELATIONSHIP_REPAIR_AT. Repassa "$@" (ex.: --force) ao node.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "23-migrate-relationship-repair-unmaterialized" "$@"
