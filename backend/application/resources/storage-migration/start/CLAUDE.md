# Start Migration

Enfileira o job de migracao de arquivos para o driver atual.

## Endpoint
`POST /storage/migration/start` | Auth: Sim | Permission: MASTER

## Body
`{ concurrency?, retry_failed_only? }`

## Fluxo
Enfileira na BullMQ; o worker copia os arquivos em paralelo (idempotente, 3
tentativas com backoff). Progresso via socket `/storage-migration`.

## Middlewares
AuthenticationMiddleware + RoleMiddleware([MASTER]).
