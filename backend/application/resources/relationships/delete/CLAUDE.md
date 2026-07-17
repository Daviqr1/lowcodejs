# Delete Relationship

Remove uma `RelationshipDefinition` e os vinculos associados.

## Endpoint
`DELETE /:slug/relationships/:id` | Auth: Sim | Permission: UPDATE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware + TableAccessMiddleware(UPDATE_FIELD)
2. Soft delete da definition (`delete`) + remove links via
   `RelationshipLinkContractRepository.deleteByRelationship`

## Repositorios
`RelationshipDefinitionContractRepository`, `RelationshipLinkContractRepository`.
