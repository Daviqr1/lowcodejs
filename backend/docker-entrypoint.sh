#!/bin/sh
set -e
chown -R 1001:1001 /app/_storage 2>/dev/null || true

echo "🔀 Verificando migração dual-connection..."
if [ -f "/app/database/migrations/migrate-dual-connection.ts" ]; then
  su-exec 1001:1001 npm run migrate:dual-connection
else
  su-exec 1001:1001 node /app/database/migrations/migrate-dual-connection.js
  # su-exec 1001:1001 node /app/database/migrations/migrate-dual-connection.js --drop-source
fi

echo "🧩 Verificando nativos dos grupos de campos..."
if [ -f "/app/database/migrations/migrate-group-native-fields.ts" ]; then
  su-exec 1001:1001 npm run migrate:group-native-fields
else
  su-exec 1001:1001 node /app/database/migrations/migrate-group-native-fields.js
fi

echo "📦 Verificando backfill de storage.location..."
if [ -f "/app/database/migrations/migrate-backfill-storage-location.ts" ]; then
  su-exec 1001:1001 npm run migrate:backfill-storage-location
else
  su-exec 1001:1001 node /app/database/migrations/migrate-backfill-storage-location.js
fi

echo "🔍 Verificando index de visibilidade nas tabelas..."
if [ -f "/app/database/migrations/migrate-add-visibility-index.ts" ]; then
  su-exec 1001:1001 npm run migrate:visibility-index
else
  su-exec 1001:1001 node /app/database/migrations/migrate-add-visibility-index.js
fi

echo "🔄 Verificando consolidação row-access (3 plugins → 1)..."
if [ -f "/app/database/migrations/migrate-consolidate-row-access.ts" ]; then
  su-exec 1001:1001 npm run migrate:consolidate-row-access
else
  su-exec 1001:1001 node /app/database/migrations/migrate-consolidate-row-access.js
fi

echo "🌱 Rodando seeders..."
if [ -f "/app/database/seeders/main.ts" ]; then
  su-exec 1001:1001 npm run seed
else
  su-exec 1001:1001 node /app/database/seeders/main.js
fi

exec su-exec 1001 "$@"
