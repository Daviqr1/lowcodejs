#!/bin/sh
# Helper comum dos wrappers de migration. NÃO é uma migration — é *sourced*
# pelos .sh irmãos (`. "$(dirname "$0")/_lib.sh"`). O loop do
# docker-entry-point pula arquivos `_*`, então este arquivo nunca roda sozinho.
#
# Fornece:
#   runas <cmd...>        — executa como usuário non-root 1001:1001 (su-exec) se
#                           disponível; senão, direto.
#   run_migration <name>  — resolve MIGRATION_DIR (/app no container ou caminho
#                           relativo em dev) e invoca o .ts irmão via SWC (ou o
#                           .js compilado). Repassa os args extras ("$@") ao node.

runas() {
  if command -v su-exec >/dev/null 2>&1; then
    su-exec 1001:1001 "$@"
  else
    "$@"
  fi
}

run_migration() {
  # $1 = basename do arquivo TS/JS sem extensão (ex.: "27-migrate-repair-owns-fk")
  name="$1"
  shift

  script_dir="$(cd "$(dirname "$0")" && pwd)"
  if [ -d "/app/database/migrations" ]; then
    migration_dir="/app/database/migrations"
  else
    migration_dir="$(cd "$script_dir/../../database/migrations" && pwd)"
  fi

  if [ -f "$migration_dir/$name.ts" ]; then
    runas node --import @swc-node/register/esm-register "$migration_dir/$name.ts" "$@"
  else
    runas node "$migration_dir/$name.js" "$@"
  fi
}
