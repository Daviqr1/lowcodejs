# Cleanup Migration

Apaga os arquivos do driver antigo apos a migracao concluida.

## Endpoint
`POST /storage/migration/cleanup` | Auth: Sim | Permission: MASTER

## Body
`{ confirm: true }`

## Fluxo
Remove os arquivos orfaos do driver anterior (so quando `can_cleanup`).
Destrutivo — exige `confirm`.

## Middlewares
AuthenticationMiddleware + RoleMiddleware([MASTER]).
