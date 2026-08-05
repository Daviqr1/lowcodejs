# Setup Upload

Grava limites de upload (`FILE_UPLOAD_MAX_SIZE`, `FILE_UPLOAD_ACCEPTED`, `FILE_UPLOAD_MAX_FILES_PER_UPLOAD`).

## Endpoint
`PUT /setup/step/upload` | Auth/Permission: MASTER

## Middlewares
AuthenticationMiddleware + RoleMiddleware([MASTER]).

## Repositorio
`SettingContractRepository` (upsert do Setting singleton).
