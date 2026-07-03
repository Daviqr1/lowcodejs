# Setup

Setup Wizard da primeira execucao: cria o usuario MASTER e preenche o documento
Setting singleton passo a passo. Grava `SETUP_CURRENT_STEP` a cada etapa e
`SETUP_COMPLETED=true` ao final.

## Base Route

`/setup`

## Operacoes

| Operacao | Metodo | Rota | Auth |
|----------|--------|------|------|
| status | GET | `/setup/status` | Nenhuma (bootstrap) |
| admin | POST | `/setup/step/admin` | Nenhuma (cria o 1o MASTER) |
| name | PUT | `/setup/step/name` | MASTER |
| storage | PUT | `/setup/step/storage` | MASTER |
| logos | PUT | `/setup/step/logos` | MASTER |
| upload | PUT | `/setup/step/upload` | MASTER |
| paging | PUT | `/setup/step/paging` | MASTER |
| email | PUT | `/setup/step/email` | MASTER |

## Middlewares

- `status` e `admin` sao **no-auth** — rodam antes de existir usuario/sessao.
- Os `PUT /step/*` exigem `AuthenticationMiddleware` + `RoleMiddleware([MASTER])`
  (so o MASTER recem-criado continua o wizard).

## Repositorios

`SettingContractRepository` (upsert do singleton), `UserContractRepository` +
`StorageContractRepository` (admin/logos). Cada step atualiza `SETUP_CURRENT_STEP`;
o ultimo marca `SETUP_COMPLETED`.

> Storage/SMTP/branding/locale vivem no Setting e sao editaveis depois via
> `/settings`. Ver `resources/setting/CLAUDE.md`.
