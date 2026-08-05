# Features

22 features REST organizadas por dominio. Cada uma tem subdiretorios por operacao
e um `_shared.validator.ts` com a entrada da fatia.

> **Nota**: o recurso `tools/` foi totalmente migrado para extensões em
> `backend/extensions/core/`: `clone-table` virou TOOL, `export-table` e
> `import-table` viraram PLUGIN (registrados em slots da página de tabelas).
> Os endpoints `/tools/clone-table`, `/tools/export-table` e
> `/tools/import-table` continuam respondendo nos mesmos paths, blindados por
> `ExtensionActiveMiddleware`.

## Estrutura por Operacao

Cada operacao (ex: `users/create/`) contem:
- `{op}.controller.ts` - Roteamento HTTP + middleware stack
- `{op}.use-case.ts` - Logica de negocio (Either pattern)
- `{op}.schema.ts` - Documentacao OpenAPI
- `{op}.use-case.spec.ts` - Teste unitario
- `{op}.controller.spec.ts` - Teste e2e

A validacao **nao** fica na pasta da operacao: vive no `_shared.validator.ts` da
fatia, e o `*.schema.ts` deriva dali o JSON Schema com `zodToRouteSchema`.

## Recursos

| Recurso | Base Route | Operacoes | Auth | Entidade |
|---------|-----------|-----------|------|----------|
| `authentication/` | `/authentication` | sign-in, sign-up, sign-out, magic-link, refresh-token, request-code, validate-code, reset-password | Misto | User, ValidationToken |
| `users/` | `/users` | create, paginated, export-csv, show, update, bulk-update, bulk-trash, bulk-restore, bulk-delete, send-to-trash, remove-from-trash, empty-trash, delete | Sim | User |
| `user-groups/` | `/user-group` | create, paginated, list, export-csv, show, update | Sim | UserGroup |
| `table-base/` | `/tables` | create, paginated, export-csv, show, update, delete, send-to-trash, remove-from-trash | Misto | Table |
| `table-fields/` | `/tables/:slug/fields` | create, show, update, delete, send-to-trash, remove-from-trash, add-category, delete-category | Sim | Field |
| `table-rows/` | `/tables/:slug/rows` | create, paginated, export-csv, show, update, delete, send-to-trash, remove-from-trash, bulk-update, bulk-trash, bulk-restore, reaction, evaluation, forum-message | Misto | Row (dinamico) |
| `group-fields/` | `/tables/:slug/groups/:groupSlug/fields` | create, list, show, update, send-to-trash | Sim | Field (embedded) |
| `group-rows/` | `/tables/:slug/rows/:rowId/groups/:groupSlug` | create, list, export-csv, show, update, delete | Sim | Row (embedded) |
| `menu/` | `/menu` | create, list, paginated, export-csv, show, update, send-to-trash, delete, remove-from-trash, reorder | Sim | Menu |
| `permissions/` | `/permissions` | list | Sim | Permission |
| `profile/` | `/profile` | show, update | Sim | User |
| `setting/` | `/setting` | show, update | Misto | Setting |
| `pages/` | `/pages` | show | Sim | Menu (type=PAGE) |
| `storage/` | `/storage` | upload (POST), delete | Sim | Storage |
| `chat/` | `/chat` | upload | Sim | - (WebSocket) |
| `extensions/` | `/extensions` | list, toggle, active, configure-table-scope | Sim (MASTER) | Extension |
| `logs/` | `/logs` | paginated | Sim | Logger |
| `notifications/` | `/notifications` | paginated, unread-count, mark-as-read, mark-all-as-read, delete | Sim | Notification |
| `setup/` | `/setup` | status, admin, name, logos, paging, email, storage, upload | Misto | Setting, User, Storage |
| `storage-migration/` | `/storage/migration` | status, start, cleanup | Sim (MASTER) | Storage |

## Middleware Stack Padrao

```
1. AuthenticationMiddleware({ optional: true/false })
2. TableAccessMiddleware({ requiredPermission: E_TABLE_PERMISSION.* })  // quando envolve tabela
```

## Formato de Resposta Padrao

- **Create**: 201, body com entidade criada
- **Read**: 200, body com entidade ou Paginated
- **Update**: 200, body com entidade atualizada
- **Delete/Trash**: 200 ou null
- **Erro**: `{ message, code, cause, errors? }` — mensagens sempre em PT-BR

## Padrao de Erros

- Mensagens de HTTPException devem ser em PT-BR
- Controllers propagam errors via `...(error.errors && { errors: error.errors })`
- Response schemas (`*.schema.ts`) incluem `errors: { type: 'object', additionalProperties: { type: 'string' } }` em todos os blocos de erro para evitar que o Fastify remova a propriedade na serializacao
- `errors` e um mapa campo→mensagem usado pelo frontend para exibir erros nos formularios

## Validacao: os tres niveis de `_shared`

| Arquivo | Alcance |
|---|---|
| `_shared.validator.ts` (raiz) | regra usada por **duas ou mais** features: `email()`, `strongPassword()`, `identifier()`, `pagination()`, `search()`, `sortDirection()`, `boolFlag()`, `bulkIds()`, `slugIdParams()`, `objectId()`, `permissionBinding()` + os tipos de escopo de sessao |
| `_shared.field.validator.ts` (raiz) | configuracao de campo do low-code, compartilhada por `table-fields` e `table-group-fields` |
| `<feature>/_shared.validator.ts` | o que so aquela fatia reusa |

Regras:

- **Uma feature nunca importa o `_shared` de outra.** Se duas precisam da mesma
  regra, ela sobe para a raiz. `grep -rn "features/[a-z-]*/_shared" application/features`
  tem que dar zero.
- **Bloco reusavel e funcao, nao constante.** `email()` devolve um no novo a
  cada chamada; uma constante compartilhada colocaria o mesmo no em dois
  validators. Em Zod isso e seguro (schema e imutavel: `.optional()` devolve no
  novo), mas a forma-funcao mantem a intencao explicita e evita que criar dois
  nomes para a mesma instancia passe despercebido.
- **O validator final e constante**, e nao funcao: `zodToRouteSchema(X)` e
  `z.infer<typeof X>` precisam do valor.
- **Escopo nunca entra no schema.** `userId`, `actorId`, `owner` e afins vem de
  `request.user` no controller e entram no payload do use-case pelo tipo
  (`RequesterScope`, `ActorScope`), nunca do corpo da requisicao.
- **Enum vem da fonte**: `z.enum(E_X)` de `entity.core.ts`, nunca membros
  soletrados nem literal solto.

`chat` e `permissions` nao tem `_shared.validator.ts` porque nao tem entrada
nenhuma para validar.
