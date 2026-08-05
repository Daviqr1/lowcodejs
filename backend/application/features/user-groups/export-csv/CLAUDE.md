# Export User Groups CSV

Exporta os grupos em CSV. Cap 500.000 linhas.

## Endpoint
`GET /user-group/exports/csv` | Auth/Permission: MANAGE_USER_GROUPS

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
`buildCsvStream` (core/csv).
