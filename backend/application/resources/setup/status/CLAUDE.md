# Setup Status

Retorna se o setup ja foi concluido (`SETUP_COMPLETED`) e o passo atual (`SETUP_CURRENT_STEP`). Consumido pela UI para rotear o wizard.

## Endpoint
`GET /setup/status` | Auth/Permission: Nenhuma (bootstrap)

## Middlewares
Nenhum middleware de auth.

## Repositorio
`SettingContractRepository` (upsert do Setting singleton).
