# Setup Logos

Faz upload/define as logos e o background de login no Setting.

## Endpoint
`PUT /setup/step/logos` | Auth/Permission: MASTER

## Middlewares
AuthenticationMiddleware + RoleMiddleware([MASTER]). `StorageContractRepository`.

## Repositorio
`SettingContractRepository` (upsert do Setting singleton).
