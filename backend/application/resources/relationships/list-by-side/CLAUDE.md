# List Links By Side

Lista (paginado) os vinculos de um registro num lado da definition.

## Endpoint
`GET /:slug/relationships/:id/links` | Auth: Opcional | Permission: VIEW_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware(optional) + TableAccessMiddleware(VIEW_ROW)
2. Recebe `side` + `recordId` + paginacao; retorna via
   `RelationshipLinkContractRepository.paginateBySide`

## Repositorios
`RelationshipLinkContractRepository`.
