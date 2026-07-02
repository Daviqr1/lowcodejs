#!/bin/sh
# Migration: relationship-dedup-consolidate
# Consolida RelationshipDefinitions duplicadas por campo source (mesmo
# source.field._id): elege a canonica, repointa links, trasha as perdedoras + os
# campos-espelho orfaos, ressincroniza as flags de cardinalidade e cria o indice
# UNIQUE parcial em source.field._id. Idempotente via marker
# MIGRATION_RELATIONSHIP_DEDUP_AT. Repassa "$@" ao node.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "28-migrate-relationship-dedup-consolidate" "$@"
