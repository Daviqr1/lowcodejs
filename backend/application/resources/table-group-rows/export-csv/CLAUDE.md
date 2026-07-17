# Export Group Rows CSV

Exporta os itens de um campo FIELD_GROUP em CSV. Cap 500.000 linhas.

## Endpoint
`GET /:slug/rows/:rowId/groups/:groupSlug/exports/csv` | Auth/Permission: VIEW_ROW

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
`buildCsvStream` (core/csv).
