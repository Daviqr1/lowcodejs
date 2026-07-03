# Import Rows CSV

Importa rows a partir de um CSV. Tambem expoe `GET /:slug/rows/imports/csv/template` (auth) para baixar o modelo de colunas.

## Endpoint
`POST /:slug/rows/imports/csv` | Auth/Permission: CREATE_ROW

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
Fila BullMQ (`CsvImportQueue`).
