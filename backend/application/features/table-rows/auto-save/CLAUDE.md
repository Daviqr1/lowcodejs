# Auto-Save Row

Salvamento incremental (rascunho) de uma row, sem validacao completa — usado pelo editor de formulario.

## Endpoint
`PATCH /:slug/rows/auto-save` | Auth/Permission: CREATE_ROW

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.
