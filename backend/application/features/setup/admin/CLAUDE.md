# Setup Admin

Cria o usuario MASTER inicial (name, email, senha) — so funciona enquanto nao existir MASTER. Avanca `SETUP_CURRENT_STEP`.

## Endpoint
`POST /setup/step/admin` | Auth/Permission: Nenhuma (cria o 1o MASTER)

## Middlewares
Sem auth (bootstrap). `UserContractRepository` + `SettingContractRepository`.

## Repositorio
`SettingContractRepository` (upsert do Setting singleton).
