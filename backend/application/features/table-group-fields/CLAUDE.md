# Group Fields

CRUD de campos dentro de grupos (FIELD_GROUP) de uma tabela.

## Base Route

`/tables/:slug/groups/:groupSlug/fields`

## Operacoes

| Operacao | Metodo | Rota | Permissao |
|----------|--------|------|-----------|
| create | POST | `/:slug/groups/:groupSlug/fields` | CREATE_FIELD |
| list | GET | `/:slug/groups/:groupSlug/fields` | VIEW_FIELD |
| show | GET | `/:slug/groups/:groupSlug/fields/:fieldId` | VIEW_FIELD |
| update | PUT | `/:slug/groups/:groupSlug/fields/:fieldId` | UPDATE_FIELD |
| send-to-trash | POST | `/:slug/groups/:groupSlug/fields/:fieldId/send-to-trash` | UPDATE_FIELD |
| remove-from-trash | PATCH | `/:slug/groups/:groupSlug/fields/:fieldId/restore` | UPDATE_FIELD |

## Middlewares Comuns

1. `AuthenticationMiddleware({ optional: false })`
2. `TableAccessMiddleware({ requiredPermission: ... })`

## Repositorios Utilizados

- `TableContractRepository` - busca e atualiza tabela pai
- `FieldContractRepository` - CRUD de campos

## Comportamento Chave

- Campos sao embedded dentro de `table.groups[].fields[]`
- Ao criar/atualizar/enviar para lixeira/restaurar um campo, o schema do grupo e da tabela pai sao reconstruidos via `buildSchema()`
- A tabela dinamica e reconstruida via `buildTable()` apos alteracoes (exceto send-to-trash, remove-from-trash e list)
- Campos nativos e locked possuem restricoes de atualizacao e nao podem ser enviados para lixeira
- Nao e possivel criar campos em um grupo cujo campo FIELD_GROUP pai esteja na lixeira (retorna 403 GROUP_IS_TRASHED)
