# Setup Email

Grava as credenciais SMTP (`EMAIL_PROVIDER_*`). Ultimo passo — marca `SETUP_COMPLETED=true`.

## Endpoint
`PUT /setup/step/email` | Auth/Permission: MASTER

## Middlewares
AuthenticationMiddleware + RoleMiddleware([MASTER]).

## Repositorio
`SettingContractRepository` (upsert do Setting singleton).
