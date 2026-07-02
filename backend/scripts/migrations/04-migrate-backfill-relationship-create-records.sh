#!/bin/sh
# Migration: backfill-relationship-create-records
# Backfilla registros de criação em campos de relacionamento existentes.
# Idempotente: skip se marker já setado no Setting.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "04-migrate-backfill-relationship-create-records" "$@"
