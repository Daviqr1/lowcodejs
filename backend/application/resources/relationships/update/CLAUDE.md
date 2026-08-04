# Update Relationship

Atualiza uma `RelationshipDefinition` (nome, endpoints, `onDelete`).

## Endpoint
`PUT /:slug/relationships/:id` | Auth: Sim | Permission: UPDATE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware + TableAccessMiddleware(UPDATE_FIELD)
2. Carrega a definition por `:id` e exige que um dos lados seja a tabela de
   `:slug`; fora do escopo retorna 404 `RELATIONSHIP_NOT_FOUND`
3. Atualiza via `RelationshipDefinitionContractRepository.update`

## Testes
- Unit: `update.use-case.spec.ts`

## Repositorios
`RelationshipDefinitionContractRepository`.
