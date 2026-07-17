#!/bin/sh
# Migration: label de campo string → objeto por contexto {list,filter,form,detail}
# Idempotente: skip se marker setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "24-migrate-field-label-to-object" "$@"
