# Core

Logica central compartilhada por toda a aplicacao.

## Arquivos

### `entity.core.ts`

Enums, tipos e interfaces do dominio. Fonte unica de verdade para:

- Enums: `E_ROLE`, `E_FIELD_TYPE`, `E_FIELD_FORMAT`, `E_FIELD_VALIDATION`,
  `E_TABLE_TYPE`, `E_TABLE_STYLE`, `E_TABLE_PERMISSION`, `E_PERMISSION_TARGET`,
  `E_TABLE_PROFILE`, `E_JWT_TYPE`, `E_USER_STATUS`, `E_SCHEMA_TYPE`,
  `E_CHAT_EVENT`
- Interfaces: `IUser`, `ITable`, `IField`, `IFieldValidation`, `IRow`, `IGroup`,
  `IPermission`, `IStorage`, `IMenu`, `ISetting`, `IValidationToken`,
  `IReaction`, `IEvaluation`
  - `IField.validations?: IFieldValidation[]` — regras de validação de valor do
    campo (camada única); opcional no tipo, sempre `[]` em runtime.
- Tipos base: `Base` (campos comuns: \_id, createdAt, updatedAt, trashed,
  trashedAt)
- Helpers: `Optional<T, K>`, `Merge<T, U>`, `ValueOf<T>`, `Paginated<Entity>`,
  `IMeta`, `ISearch`
- Constantes: `FIELD_NATIVE_LIST`, `FIELD_GROUP_NATIVE_LIST` (7 campos nativos
  cada: _id, creator/CREATOR, createdAt, updatedAt, updater/UPDATER, status,
  trashedAt — os 4 de auditoria createdAt/creator/updatedAt/updater seguem o
  mesmo padrao: nativos, locked, nao excluiveis, apenas ocultaveis)

### `exception.core.ts`

Classe `HTTPException` que extends `Error`. Factory methods estaticos para cada
HTTP status:

- `BadRequest(message?, cause?, errors?)` - 400, aceita `errors` para erros de
  campo
- `Unauthorized(message?, cause?, errors?)` - 401, aceita `errors` (ex:
  INVALID_CREDENTIALS com erros por campo)
- `Forbidden(message?, cause?)` - 403
- `NotFound(message?, cause?)` - 404
- `Conflict(message?, cause?)` - 409
- `InternalServerError(message?, cause?)` - 500
- Estrutura: `{ message, code, cause, errors? }`
- Todas as mensagens devem ser em PT-BR

### `either.core.ts`

Pattern funcional para error handling:

- `Left<L, R>` = erro, `Right<L, R>` = sucesso
- Usado em todos os use-cases: `Either<HTTPException, T>`
- Metodos: `isLeft()`, `isRight()`, `.value`

### Builders Mongoose (movidos para `services/table/`)

As funcoes de schema/query/model/populate building viraram classes em
`application/services/table/` (`MongooseSchemaBuilder`, `MongooseModelBuilder`,
`MongooseQueryBuilder`, `MongoosePopulateBuilder`, `RowContextBuilder`). Sao
detalhe de impl Mongoose — ver `services/table/CLAUDE.md`. O antigo
`util.core.ts` (facade) foi removido.

### `field-rules.core.ts`

Constantes/regexes puros de validacao de campo agnosticos de banco. Fonte unica
reusada pelo `RowPayloadValidator` (format legado) **e** pelas regras de
`validations/`. Ex: `PASSWORD_REGEX`, `EMAIL_REGEX`, `CPF_REGEX`, `NUMERIC_REGEX`.

### `validations/` (camada unica de validacao)

Regras de validacao de valor configuraveis por campo (`field.validations[]`),
uma por subpasta, implementando `FieldValidationRule`. Executadas (async) pelo
`FieldValidationService` no create/update de row. Ver `validations/CLAUDE.md`.

### `row-payload-validator.core.ts`

Classe `RowPayloadValidator` com metodo estatico `validate(payload, fields, groups?)`
- valida dados de row contra definicao de campos:

- Validadores por tipo: TEXT_SHORT/LONG, DATE, DROPDOWN, FILE, RELATIONSHIP,
  CATEGORY, FIELD_GROUP
- Validadores de **formato** (legado, sincrono, todos os caminhos de escrita):
  EMAIL, URL, INTEGER, DECIMAL, PHONE, CNPJ, CPF (regexes de `field-rules.core`).
  As validacoes **configuraveis** (is-unique, ranges, etc.) ficam em
  `validations/` + `FieldValidationService`, nao aqui.

### `field-slug.core.ts`

Classe `FieldSlug` (estatica): `normalize`/`suggest`/`getError`/`resolve`/
`suggestUnique` para slugs de campo (via `slugify`, `^[a-z0-9]+(-[a-z0-9]+)*$`,
2–80 chars). `suggestUnique` desambigua com sufixo `-N`.

### `menu-visibility.core.ts`

Classe `MenuVisibility` (estatica): avalia o binding `visibility` de um menu e da
cadeia de ancestrais (pai oculto esconde a subarvore). `bindingAllows` +
`isVisible`. Compartilhada entre sidebar de menu e exibicao de paginas.

### `row-ownership.core.ts`

`resolveCreatorId(creator)` — normaliza o dono de uma row (string, ObjectId ou
`{ _id }` populado) em `string | null`. Usada no enforcement "apenas as suas"
(perfil contributor) nos use-cases de update/delete/send-to-trash.

### `row-password-helper.core.ts`

Helpers de campos TEXT_SHORT+PASSWORD: `hashPasswordFields` (bcrypt, pula ja
hasheados/mascarados), `stripMaskedPasswordFields` (descarta vazios/mascara no
update) e `maskPasswordFields` (mascara na leitura com `••••••••`).

### `object-id.util.ts`

`isValidObjectId(id)` — wrapper de `mongoose.Types.ObjectId.isValid`.

### `controllers.ts`

Carrega dinamicamente todos os `*.controller.ts` de `resources/` para registro
no Fastify.

### `di-registry.ts`

Registro **dinamico** de dependencias (Contract -> Implementation), no mesmo
espirito de `controllers.ts`: varre o filesystem e pareia por convencao em vez de
manter lista manual.

- Roots varridos: `application/repositories`, `application/services` e
  `extensions/` (cada um guardado por `existsSync`)
- Convencao unica: `<base>-contract.<kind>.ts` (export nomeado
  `<X>Contract(Repository|Service)`) pareia com `<base>.<kind>.ts`
  (`export default`). O impl e *derivado* do base — `in-memory-*`, `*.worker` e
  drivers nunca colidem
- `registerDependencies()` e **async** (faz `await import()` de cada modulo) e e
  awaited em `start/kernel.ts` antes do bootstrap dos controllers
- Usa `injectablesHolder.injectService()` do fastify-decorators

## Subdiretorios

| Subpasta      | Responsabilidade                                                                 | Doc |
| ------------- | -------------------------------------------------------------------------------- | --- |
| `table/`      | Sandbox VM de scripts de usuario (beforeSave/afterSave/onLoad)                    | `table/CLAUDE.md` |
| `validations/`| Camada unica de validacao de valor configuravel por campo (`field.validations[]`)| `validations/CLAUDE.md` |
| `csv/`        | Utilitarios puros de exportacao CSV (filename, format, streaming em batches)      | `csv/CLAUDE.md` |
| `extensions/` | Infra core de extensoes: loader de boot, schema Zod do manifest, contrato de guard| `extensions/CLAUDE.md` |
| `logger/`     | Resolve auditoria (creator/updater/datas) da ROW referenciada por um log          | `logger/CLAUDE.md` |

### `table/`

Sistema de sandbox para execucao de scripts de usuario (beforeSave, afterSave,
onLoad).

| Arquivo             | Responsabilidade                                                                 |
| ------------------- | -------------------------------------------------------------------------------- |
| `executor.ts`       | Executa codigo em Node VM com timeout (5s). Valida sintaxe.                      |
| `handler.ts`        | Orquestra: monta sandbox + executa + coleta logs                                 |
| `sandbox.ts`        | Monta ambiente isolado com APIs: `field`, `context`, `email`, `users`, `notify`, `utils`, `console` |
| `field-resolver.ts` | Resolve valores de campo com normalizacao                                        |
| `types.ts`          | Tipos TypeScript para execucao                                                   |
