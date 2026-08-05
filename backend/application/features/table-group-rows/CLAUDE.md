# Group Rows

CRUD de itens (rows) embedded dentro de um campo FIELD_GROUP de uma row pai.

## Base Route

`/tables/:slug/rows/:rowId/groups/:groupSlug`

## Operacoes

| Operacao | Metodo | Rota | Permissao |
|----------|--------|------|-----------|
| create | POST | `/:slug/rows/:rowId/groups/:groupSlug` | CREATE_ROW |
| list | GET | `/:slug/rows/:rowId/groups/:groupSlug` | VIEW_ROW |
| export-csv | GET | `/:slug/rows/:rowId/groups/:groupSlug/exports/csv` | VIEW_ROW (interseção grupo+tabela) |
| show | GET | `/:slug/rows/:rowId/groups/:groupSlug/:itemId` | VIEW_ROW |
| update | PATCH | `/:slug/rows/:rowId/groups/:groupSlug/:itemId` | UPDATE_ROW |
| delete | DELETE | `/:slug/rows/:rowId/groups/:groupSlug/:itemId` | REMOVE_ROW |

## Middlewares Comuns

1. `AuthenticationMiddleware({ optional: false })`
2. `TableAccessMiddleware({ requiredPermission: ... })`

## Repositorios Utilizados

- `TableContractRepository` - busca tabela e metadados dos grupos

## Comportamento Chave

- Itens sao subdocumentos Mongoose dentro de um array no campo FIELD_GROUP da row pai
- A tabela dinamica e construida via `buildTable()` para acessar as rows
- O corpo da requisicao e um record dinamico (z.record) validado contra os campos do grupo via `validateRowPayload()`
- Campos de senha sao hashed antes de salvar e masked ao retornar
- Populacoes de campos RELATIONSHIP sao aplicadas via `buildPopulate()`
- Delete e hard delete (remove subdocumento permanentemente via `subdoc.deleteOne()`)
