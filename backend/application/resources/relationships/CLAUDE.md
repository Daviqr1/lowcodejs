# Relationships

Gerencia relacionamentos entre tabelas (definicoes) e os vinculos concretos
entre registros (links). A `RelationshipDefinition` e a fonte de verdade do
vinculo; os `RelationshipLink` sao as arestas. Ver spec de relacionamento
(§9/§10) e `repositories/relationship-definition|relationship-link`.

## Base Route

`/:slug/relationships` (o `:slug` e a tabela de um dos lados)

## Operacoes

| Operacao | Metodo | Rota | Permissao |
|----------|--------|------|-----------|
| create | POST | `/:slug/relationships` | CREATE_FIELD |
| update | PUT | `/:slug/relationships/:id` | UPDATE_FIELD |
| delete | DELETE | `/:slug/relationships/:id` | UPDATE_FIELD |
| link | POST | `/:slug/relationships/:id/links` | CREATE_ROW |
| list-by-side | GET | `/:slug/relationships/:id/links` | VIEW_ROW (auth opcional) |
| reorder | PATCH | `/:slug/relationships/:id/links/reorder` | UPDATE_ROW |
| unlink | DELETE | `/:slug/relationships/:id/links/:linkId` | UPDATE_ROW |

## Middlewares

`AuthenticationMiddleware` + `TableAccessMiddleware({ requiredPermission })`.
Operacoes de **definicao** (create/update/delete) usam permissoes de FIELD;
operacoes de **link** (link/reorder/unlink) usam permissoes de ROW.
`list-by-side` e auth-opcional (leitura publica quando a tabela permite).

## Repositorios

- `RelationshipDefinitionContractRepository` — definicoes
- `RelationshipLinkContractRepository` — vinculos (idempotencia, paginacao por
  lado, politicas de delete §9)
- `TableContractRepository` / `FieldContractRepository` — validacao dos endpoints

## Comportamento Chave

- `link` respeita as regras de cardinalidade (`canLink`) e a idempotencia
  (`exists`) do par (relationshipId, source, target).
- `delete` de definicao remove os links associados (`deleteByRelationship`).
- `list-by-side` pagina os vinculos do registro no lado indicado por `side`.
- Toda operacao com `:id` valida que a definition pertence a tabela de `:slug`
  (`definitionBelongsToTable`, em `definition-scope.ts`) — o
  `TableAccessMiddleware` autoriza contra `:slug`, entao sem essa checagem quem
  tem acesso a tabela A operaria relacionamentos da tabela B. Fora do escopo, a
  resposta e 404 `RELATIONSHIP_NOT_FOUND` (nao revela a existencia do id).
