# Export Rows CSV

Exporta as rows da tabela em CSV com colunas dinamicas (uma por field). Cap 500.000 linhas.

## Endpoint
`GET /:slug/rows/exports/csv` | Auth/Permission: VIEW_ROW

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
`buildCsvStream`/`iterateInBatches` (core/csv).
