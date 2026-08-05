# Link Records

Cria um vinculo (`RelationshipLink`) entre dois registros sob uma definition,
pelos dois lados. Aplica as regras de cardinalidade (`canLink`).

## Endpoint
`POST /:slug/relationships/:id/links` | Auth: Sim | Permission: CREATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware + TableAccessMiddleware(CREATE_ROW)
2. `side` indica qual lado e a tabela `:slug`; `recordId` o registro deste lado e
   `otherId` o do outro
3. Checa cardinalidade + idempotencia (`exists`) e cria via
   `RelationshipLinkContractRepository.create`

## Repositorios
`RelationshipLinkContractRepository`, `RelationshipDefinitionContractRepository`.
