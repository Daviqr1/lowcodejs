#!/bin/sh
# Migration: menu-visibility
# Define visibility=PUBLIC nos menus existentes (legado: visível a todos).
# Idempotente: skip se marker setado.
set -e
. "$(dirname "$0")/_lib.sh"
run_migration "11-migrate-menu-visibility" "$@"
