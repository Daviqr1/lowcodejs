# Reorder Links

Reordena os vinculos de um registro num lado da definition.

## Endpoint
`PATCH /:slug/relationships/:id/links/reorder` | Auth: Sim | Permission: UPDATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware + TableAccessMiddleware(UPDATE_ROW)
2. Aplica a nova ordem via `RelationshipLinkContractRepository.setOrder`

## Repositorios
`RelationshipLinkContractRepository`.
