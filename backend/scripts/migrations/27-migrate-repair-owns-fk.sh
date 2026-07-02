#!/bin/sh
# Migration: repair-owns-fk
# Restaura FKs inline de relacionamentos OWNS_FK (1:1/1:N) que foram apagadas
# pela migration 23 ao recriar links indevidamente. Apaga os links criados pela
# 23 para essas definitions após restaurar as FKs. Idempotente via marker
# MIGRATION_REPAIR_OWNS_FK_AT. Repassa "$@" ao node.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "27-migrate-repair-owns-fk" "$@"
