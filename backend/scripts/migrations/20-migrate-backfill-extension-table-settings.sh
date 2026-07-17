#!/bin/sh
# Migration: backfill-extension-table-settings
# Garante o campo `tableSettings` (default {}) nos Extension docs existentes — o
# campo Mixed foi adicionado ao model junto do row-access guard. Mongoose só
# aplica o default em leitura/escrita nova; aqui persistimos o {} nos docs
# antigos. Idempotente via marker MIGRATION_EXTENSION_TABLE_SETTINGS_AT.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "20-migrate-backfill-extension-table-settings" "$@"
