#!/bin/sh
# Migration: backfill de formMode='manage' em campos espelho N:N
# Idempotente: skip se marker setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "25-migrate-relationship-backfill-form-mode" "$@"
