# Create Relationship

Cria uma `RelationshipDefinition` (dois endpoints source/target + politica de
delete) entre a tabela `:slug` e outra tabela.

## Endpoint
`POST /:slug/relationships` | Auth: Sim | Permission: CREATE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware + TableAccessMiddleware(CREATE_FIELD)
2. Valida os endpoints (tabela + campo RELATIONSHIP de cada lado)
3. Cria a definition via `RelationshipDefinitionContractRepository.create`
4. Materializa os campos-espelho / back-pointers `relationshipId`

## Repositorios
`RelationshipDefinitionContractRepository`, `FieldContractRepository`,
`TableContractRepository`.
