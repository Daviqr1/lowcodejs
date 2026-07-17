# Show Row By Slug

Busca uma row pelo campo-slug configurado da tabela (`rowSlugFieldId`) em vez do `_id` — permite URLs amigaveis.

## Endpoint
`GET /:slug/rows/by-slug/:rowSlug` | Auth/Permission: VIEW_ROW (auth opcional)

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.
