#!/bin/sh
# Migration: drop-legacy-permission-fields
# Remove os campos legados (visibility/collaboration/administrators das tabelas e
# showIn* dos campos) dos documentos JA migrados para o novo modelo.
# Roda DEPOIS de 09/10/11 (backfills). Idempotente: skip se marker setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "12-migrate-drop-legacy-permission-fields" "$@"
