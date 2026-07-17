# Users Resource

Gerenciamento de usuarios da plataforma (CRUD).

## Entidade

`IUser` - definida em `@application/core/entity.core`

## Repositorio

`UserContractRepository` -> `UserMongooseRepository`

## Servicos

`EmailQueueContractService` - enfileira email apos create (welcome) e update (campos sensiveis: password/email/status). Worker BullMQ processa o envio

## Endpoints

| Operacao | Metodo | Rota | Descricao |
|----------|--------|------|-----------|
| create | POST | `/users` | Criar novo usuario |
| paginated | GET | `/users/paginated` | Listar usuarios com paginacao |
| export-csv | GET | `/users/exports/csv` | Exporta usuarios em CSV (MASTER/ADMINISTRATOR; cap 500.000 linhas) |
| show | GET | `/users/:_id` | Buscar usuario por ID |
| update | PATCH | `/users/:_id` | Atualizar usuario |
| bulk-update | PATCH | `/users/bulk-update` | Alterar status (ACTIVE/INACTIVE) de varios usuarios (exclui o proprio) |

## Auth

Todas as operacoes rodam primeiro `AuthenticationMiddleware({ optional: false })`
(autenticacao obrigatoria) e, em seguida,
`PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS)` — ou seja, exigem a
capability MANAGE_USERS. Isso vale para create, update, show, bulk-update,
bulk-trash, bulk-restore, bulk-delete, send-to-trash, remove-from-trash,
empty-trash, delete e export-csv.

**Excecao — `paginated`**: permanece apenas autenticada (somente
`AuthenticationMiddleware`, sem `PermissionMiddleware`). Isso e intencional:
o endpoint alimenta os pickers de campos USER em toda a aplicacao, members de
tabela e selects de forum; gatear este endpoint quebraria a edicao normal de
registros para usuarios sem MANAGE_USERS.

## Validator Base

`user-base.validator.ts` - Schema Zod reutilizado por create e update:
- `name`: string, required, trim, min 1
- `email`: string, email, trim
- `group`: string, required, min 1
