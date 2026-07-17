# Repositories

Camada de acesso a dados com pattern Contract + Implementation.

## Pattern

Cada entidade possui ate 3 arquivos:
1. **`{entidade}-contract.repository.ts`** - Classe abstrata (export nomeado `{Entity}ContractRepository`) com metodos e payload types
2. **`{entidade}.repository.ts`** - Implementacao Mongoose (`@Service() export default class`)
3. **`{entidade}-in-memory.repository.ts`** - Implementacao em memoria para testes unitarios (ignorada pelo scanner do DI). **Opcional** — entidades cobertas so por e2e (ex: `logger`, `notification`) nao tem in-memory.

> **`entity-fixtures.ts`** (raiz de `repositories/`) — builders de entidade
> completa (`makeUser`, `makeGroup`, `makePermission`, `makeField`, `makeStorage`,
> `makeSetting`) usados pelos in-memory doubles para materializar refs populadas
> sem asercao de tipo. Nao e um repositorio (ignorado pelo scanner do DI).

## Metodos Padrao

| Metodo | Descricao |
|--------|-----------|
| `create(payload)` | Cria documento |
| `createMany(payloads)` | Cria multiplos (quando aplicavel) |
| `findById(_id, options?)` | Busca por _id |
| `findByX(x, options?)` | Busca por campo unico (slug, email, code, filename) |
| `findMany(payload)` | Query com search, paginacao, filtros |
| `update(payload)` | Atualiza por _id |
| `updateMany(payload)` | Atualiza multiplos (quando aplicavel) |
| `delete(_id)` | Soft delete (trashed=true, trashedAt=now) |
| `count(payload)` | Conta documentos matchando query |

## Payloads Tipados

Cada contract define seus proprios tipos:
- `{Entity}CreatePayload` - dados para criacao
- `{Entity}UpdatePayload` - _id + campos parciais
- `FindOptions` - trashed (opcional, de entity.core)
- `{Entity}QueryPayload` - page, perPage, search, trashed, sort, filtros especificos

## Entidades com Repository

| Diretorio | Entidade | Metodos Extras |
|-----------|----------|----------------|
| `user/` | IUser | - |
| `user-group/` | IGroup | - |
| `permission/` | IPermission | - |
| `table/` | ITable | `renameSlug()`, `dropCollection()`, `findByFieldIds()` |
| `field/` | IField | - |
| `storage/` | IStorage | - |
| `validation-token/` | IValidationToken | - |
| `menu/` | IMenu | - |
| `reaction/` | IReaction | - |
| `evaluation/` | IEvaluation | - |
| `setting/` | ISetting | Singleton (so `get()` + `update()` upsert); sem in-memory proprio |
| `row/` | IRow | Schema dinamico por tabela; ver `row/CLAUDE.md` |
| `logger/` | ILogger | Append-only; sem in-memory (e2e) |
| `notification/` | INotification | Escopado por `userId`; sem in-memory (e2e) |
| `extension/` | IExtension | Chave `(pkg,type,extensionId)`; ver `extension/CLAUDE.md` |
| `relationship-definition/` | IRelationshipDefinition | Fonte de verdade do vinculo; ver CLAUDE.md |
| `relationship-link/` | IRelationshipLink | Arestas entre registros; ver CLAUDE.md |

## Registro DI

Registrado **automaticamente** pelo scanner de `core/di-registry.ts`, que pareia
`{entidade}-contract.repository.ts` ↔ `{entidade}.repository.ts` por convencao
(equivalente a `injectService(UserContractRepository, UserMongooseRepository)`).
Nao ha lista manual.

## Para Criar Novo Repository

1. Crie `{entidade}-contract.repository.ts` com abstract class
   `{Entity}ContractRepository` (export nomeado) e payload types
2. Crie `{entidade}.repository.ts` com `@Service() export default class` da impl
3. Crie `{entidade}-in-memory.repository.ts` para testes

O DI registra o par sozinho — **nao precisa editar `di-registry.ts`**.
