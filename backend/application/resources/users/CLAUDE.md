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

## Arquivos compartilhados da fatia

Esta e a **fatia de referencia** do padrao — as demais seguem este molde.

### `_shared.validator.ts` — entrada

Fonte unica da validacao. Os `*.schema.ts` derivam dali o JSON Schema da rota
com `zodToRouteSchema` (`core/schema.core.ts`), entao a regra nao existe escrita
duas vezes. Exporta os schemas Zod e os tipos que os use-cases consomem como
`Payload`.

Blocos reusados: `UserIdentifierParamsValidator` (o `:_id`, antes copiado em 5
operacoes), `UserBulkIdsBodyValidator` (as tres operacoes em massa sem outro
campo) e o filtro de listagem compartilhado por `paginated` e `export-csv`.

O `.parse()` continua no controller — nao pela validacao, que o AJV ja fez, mas
pelas transformacoes que o JSON Schema nao representa (`.trim()`, coercao).

### `_shared.response.ts` — saida

O Fastify **remove da resposta** o que nao estiver declarado, entao estes blocos
definem o que vai no ar. Duas formas de usuario, e a diferenca e deliberada:
`UserDetailResponse` traz o grupo inteiro (create/show/update),
`UserPaginatedResponse` traz so a referencia do grupo.

## Serializacao

`UserMapperService` roda **no use-case**, nao no controller: o `Either` ja
carrega `UserResponse` (sem `password`). Assim um endpoint novo que devolva o
usuario nao tem como vazar o hash por esquecimento.
