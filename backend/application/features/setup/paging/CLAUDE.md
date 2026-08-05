# Setup Paging

Grava `PAGINATION_PER_PAGE` e `MODEL_CLONE_TABLES` (tabelas-modelo de clonagem).

## Endpoint
`PUT /setup/step/paging` | Auth/Permission: MASTER

## Middlewares
AuthenticationMiddleware + RoleMiddleware([MASTER]).

## Repositorio
`SettingContractRepository` (upsert do Setting singleton).
