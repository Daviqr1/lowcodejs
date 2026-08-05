# Unlink Records

Remove um vinculo (`RelationshipLink`) especifico.

## Endpoint
`DELETE /:slug/relationships/:id/links/:linkId` | Auth: Sim | Permission: UPDATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware + TableAccessMiddleware(UPDATE_ROW)
2. Remove via `RelationshipLinkContractRepository.delete`

## Repositorios
`RelationshipLinkContractRepository`.
