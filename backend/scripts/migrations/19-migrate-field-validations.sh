#!/bin/sh
# Migration: field-validations
# Backfilla o array `validations` (default []) em Field docs existentes — base da
# camada unica de validacao de campo (core/validations/*). Nao deriva regras do
# `format` (legado segue validando). Idempotente via marker
# MIGRATION_FIELD_VALIDATIONS_AT no Setting singleton.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "19-migrate-field-validations" "$@"
