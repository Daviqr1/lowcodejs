# Auto-Save Group Row

Salvamento incremental (rascunho) de um item de grupo, sem validacao completa — usado pelo editor.

## Endpoint
`PATCH /:slug/rows/:rowId/groups/:groupSlug/auto-save` | Auth/Permission: UPDATE_ROW

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.
