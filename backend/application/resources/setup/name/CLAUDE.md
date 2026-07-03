# Setup Name

Grava `SYSTEM_NAME`/`SYSTEM_DESCRIPTION`/`LOCALE` no Setting.

## Endpoint
`PUT /setup/step/name` | Auth/Permission: MASTER

## Middlewares
AuthenticationMiddleware + RoleMiddleware([MASTER]).

## Repositorio
`SettingContractRepository` (upsert do Setting singleton).
