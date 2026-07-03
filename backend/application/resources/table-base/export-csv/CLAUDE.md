# Export Tables CSV

Exporta a metadata das tabelas que casam com os filtros, em CSV. Cap 500.000 linhas.

## Endpoint
`GET /tables/exports/csv` | Auth/Permission: MASTER/ADMINISTRATOR (RoleMiddleware)

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
`buildCsvStream` (core/csv).
