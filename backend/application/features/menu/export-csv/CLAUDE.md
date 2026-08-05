# Export Menu CSV

Exporta os menus (metadata) em CSV. Cap de 500.000 linhas.

## Endpoint
`GET /menu/exports/csv` | Auth/Permission: MANAGE_MENU

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
`buildCsvStream` (core/csv). `MenuContractRepository`.
