# Suggest Field Slug

Sugere um slug unico para um campo novo a partir do nome (via `FieldSlug.suggestUnique`), evitando colisao com os campos existentes.

## Endpoint
`POST /:slug/fields/suggest-slug` | Auth/Permission: CREATE_FIELD

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
`FieldSlug` (core). `FieldContractRepository`.
