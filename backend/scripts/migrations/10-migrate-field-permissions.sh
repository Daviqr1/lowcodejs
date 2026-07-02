#!/bin/sh
# Migration: field-permissions
# Backfilla a visibilidade por contexto (list/form/detail) a partir dos booleans
# showIn* legados. Idempotente: skip se marker setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "10-migrate-field-permissions" "$@"
