#!/bin/sh
# Migration: renomeia slugs de campo com caracteres especiais (legado sem `strict`)
# Idempotente: skip se marker setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "29-migrate-sanitize-field-slugs" "$@"
