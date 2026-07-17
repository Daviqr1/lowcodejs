# Update Relationship

Atualiza uma `RelationshipDefinition` (nome, endpoints, `onDelete`).

## Endpoint
`PUT /:slug/relationships/:id` | Auth: Sim | Permission: UPDATE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware + TableAccessMiddleware(UPDATE_FIELD)
2. Atualiza via `RelationshipDefinitionContractRepository.update`

## Repositorios
`RelationshipDefinitionContractRepository`.
