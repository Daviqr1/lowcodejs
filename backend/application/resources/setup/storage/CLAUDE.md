# Setup Storage

Grava `STORAGE_DRIVER` (local/s3) + credenciais S3 no Setting; sincroniza com process.env.

## Endpoint
`PUT /setup/step/storage` | Auth/Permission: MASTER

## Middlewares
AuthenticationMiddleware + RoleMiddleware([MASTER]).

## Repositorio
`SettingContractRepository` (upsert do Setting singleton).
