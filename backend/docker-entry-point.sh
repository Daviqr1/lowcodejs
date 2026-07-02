#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Em dev a imagem copia este entrypoint para "/" (raiz), mas o código da app
# (scripts/migrations, database/seeders) vive em /app. Cai para /app quando os
# scripts não estão ao lado do entrypoint.
if [ ! -d "$SCRIPT_DIR/scripts/migrations" ] && [ -d /app/scripts/migrations ]; then
  SCRIPT_DIR=/app
fi

chown -R 1001:1001 "$SCRIPT_DIR/_storage" 2>/dev/null || true

runas() {
  if command -v su-exec >/dev/null 2>&1; then
    su-exec 1001:1001 "$@"
  else
    "$@"
  fi
}

# `./docker-entry-point.sh --force` reexecuta TODAS as migrations ignorando o
# marker; sem o argumento, roda normal. O --force é consumido aqui (shift) para
# não poluir o CMD do server no `exec "$@"` final. Cada .sh repassa "$@" ao node.
FORCE_FLAG=""
if [ "$1" = "--force" ]; then
  FORCE_FLAG="--force"
  shift
fi

echo "🚀 Preparando o banco de dados"
echo ""
echo "Migrations"
for script in "$SCRIPT_DIR/scripts/migrations"/*.sh; do
  # Pula helpers/partials (`_lib.sh` etc) — não são migrations, são sourced.
  case "$(basename "$script")" in _*) continue ;; esac
  sh "$script" $FORCE_FLAG
done
echo "✓ Migrations concluídas"
echo ""

echo "Seeders"
if [ -f "$SCRIPT_DIR/database/seeders/main.ts" ]; then
  runas npm run --silent seed
else
  runas node "$SCRIPT_DIR/database/seeders/main.js"
fi

# Sem CMD (ex.: rodou só `./docker-entry-point.sh --force` para migrar): nada a
# subir, sai limpo após migrations + seeders.
if [ "$#" -eq 0 ]; then
  exit 0
fi

if command -v su-exec >/dev/null 2>&1; then
  exec su-exec 1001 "$@"
else
  exec "$@"
fi
