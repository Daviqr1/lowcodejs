# Export Users CSV

Exporta os usuarios em CSV. Cap 500.000 linhas.

## Endpoint
`GET /users/exports/csv` | Auth/Permission: MANAGE_USERS

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
`buildCsvStream` (core/csv).
