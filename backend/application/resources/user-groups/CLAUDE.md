# User Groups Resource

Gerenciamento de grupos de usuarios com permissoes (CRUD + listagem).

## Entidade

`IGroup` - definida em `@application/core/entity.core`

## Repositorio

`UserGroupContractRepository` -> `UserGroupMongooseRepository`

## Endpoints

| Operacao | Metodo | Rota | Descricao |
|----------|--------|------|-----------|
| create | POST | `/user-group` | Criar novo grupo de usuarios |
| list | GET | `/user-group` | Listar todos os grupos (sem paginacao) |
| paginated | GET | `/user-group/paginated` | Listar grupos com paginacao |
| export-csv | GET | `/user-group/exports/csv` | Exporta grupos em CSV (MASTER/ADMINISTRATOR; cap 500.000 linhas) |
| show | GET | `/user-group/:_id` | Buscar grupo por ID |
| update | PATCH | `/user-group/:_id` | Atualizar grupo |

## Auth

Todas as operacoes rodam primeiro `AuthenticationMiddleware({ optional: false })`
(autenticacao obrigatoria) e, em seguida,
`PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS)` — ou seja, exigem a
capability MANAGE_USER_GROUPS. Isso vale para create, update, show, paginated,
bulk-trash, bulk-restore, bulk-delete, send-to-trash, remove-from-trash,
empty-trash, delete e export-csv.

**Excecao — `list`**: permanece apenas autenticada (somente
`AuthenticationMiddleware`, sem `PermissionMiddleware`). Isso e intencional:
o endpoint alimenta os pickers de vinculo de permissao, os multi-selects de
grupo e o `use-field-visibility` para todo usuario autenticado; gatear este
endpoint quebraria esses fluxos para usuarios sem MANAGE_USER_GROUPS.
