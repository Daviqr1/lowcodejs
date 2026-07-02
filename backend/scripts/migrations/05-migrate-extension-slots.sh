#!/bin/sh
# Migration: extension-slots
# Renomeia o campo `slot` para `slots` (array) em documentos de extensões.
# Necessário após refatoração da API de extensões.
# Idempotente: skip se marker já setado no Setting.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "05-migrate-extension-slots" "$@"
