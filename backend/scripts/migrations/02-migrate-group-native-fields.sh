#!/bin/sh
# Migration: native-fields (tabela + grupos)
# Garante os campos nativos no nivel raiz da tabela (FIELD_NATIVE_LIST) e em cada
# subtabela FIELD_GROUP (FIELD_GROUP_NATIVE_LIST), incluindo os de auditoria
# updatedAt e updater. Marker versionado MIGRATION_NATIVE_FIELDS_AT.
# Idempotente: verifica presença por slug antes de inserir.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "02-migrate-group-native-fields" "$@"
