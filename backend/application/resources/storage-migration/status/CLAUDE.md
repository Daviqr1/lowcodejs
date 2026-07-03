# Migration Status

Retorna o estado atual da migracao de storage.

## Endpoint
`GET /storage/migration/status` | Auth: Sim | Permission: MASTER

## Resposta
Contagens por driver/status, job ativo e `can_cleanup`.

## Middlewares
AuthenticationMiddleware + RoleMiddleware([MASTER]).
