# Core

Tipo, valor e bootstrap. **Nada de comportamento** — o que *faz* algo (I/O,
transformacao, decisao) vive em `application/services/<contexto>/` como service
injetavel. O que *e* algo (tipo, enum, regex, classe de dado) fica aqui.

Sao 9 arquivos. Antes eram 42: os outros 35 viraram (ou foram absorvidos por)
services — ver a tabela de "para onde foi" no fim.

## Arquivos

### `entity.core.ts`

Fonte unica de enums, tipos e interfaces do dominio. ~110 exports, 643
importadores — o maior hub do repo.

- Enums: `E_ROLE`, `E_FIELD_TYPE`, `E_FIELD_FORMAT`, `E_FIELD_VALIDATION`,
  `E_TABLE_TYPE`, `E_TABLE_STYLE`, `E_TABLE_PERMISSION`, `E_PERMISSION_TARGET`,
  `E_TABLE_PROFILE`, `E_JWT_TYPE`, `E_USER_STATUS`, `E_SCHEMA_TYPE`,
  `E_CHAT_EVENT`, `E_LOGGER_*`, `E_EXTENSION_TYPE`, `E_NOTIFICATION_*` e outros
- Tipos de entidade: `IUser`, `ITable`, `IField`, `IRow`, `IGroup`,
  `IPermission`, `IStorage`, `IMenu`, `ISetting`, `IValidationToken`,
  `IReaction`, `IEvaluation`, `IRelationship*`
- Helpers de tipo: `Optional<T, K>`, `Merge<T, U>`, `ValueOf<T>`,
  `Paginated<Entity>`, `IMeta`, `ISearch`, `Base`
- Funcoes puras: `buildDefaultTablePermissions`, `buildFieldPermissions`
- Constantes: `FIELD_NATIVE_LIST`, `FIELD_GROUP_NATIVE_LIST`,
  `TABLE_PROFILE_MATRIX`, `SYSTEM_GROUP_SLUGS`

### `exception.core.ts`

`HTTPException` (default export, estende `Error`) com ~40 factories estaticas
por status. Estrutura `{ message, code, cause, errors? }`. Mensagens em PT-BR.

### `either.core.ts`

`Left` / `Right` / `Either<L, R>` + os factories `left()` e `right()`. Todo
use-case retorna `Either<HTTPException, T>`.

### `field-rules.core.ts`

Regexes e limites puros, sem banco. Fonte unica compartilhada pelo
`RowPayloadValidatorService` (validacao por `format`), pelas regras de
`services/field-validation/rules/` e pelos schemas Zod de escopo de modulo — que
precisam desses valores em tempo de import, quando o container de DI ainda nao
existe.

`PASSWORD_REGEX`, `EMAIL_REGEX`, `URL_REGEX`, `PHONE_REGEX`, `CNPJ_REGEX`,
`CPF_REGEX`, `ALPHA_NUMERIC_REGEX`, `INTEGER_REGEX`, `DECIMAL_REGEX`,
`NUMERIC_REGEX`, `OBJECT_ID_REGEX`, `NAME_MAX_LENGTH`, `SLUG_MAX_LENGTH`,
`SLUG_MIN_LENGTH`, `SLUG_REGEX`.

### `validator.core.ts`

Blocos Zod repetidos pelos validators dos recursos: `PageValidator`,
`PerPageValidator`, `PaginationQueryValidator` (page + perPage, estendido por
`.extend()`), `SlugIdParamsValidator` (`:slug` + `:_id` das rotas de row e de
campo), `BulkIdsValidator` (cap por chamador com `.max(n)`) e
`TrashedFlagValidator`.

### `schema.core.ts`

`buildErrorResponse(code, cause, { description, message, ... })` — bloco de erro
dos `*.schema.ts` da documentacao OpenAPI, mais a constante
`UnauthorizedResponse`. `errors` sempre declarado: o Fastify remove da resposta
o que nao esta no schema.

### `row-access-guard.contract.ts`

Tipos do contrato de plugin de guarda de row (`RowAccessGuard`,
`GuardEvalContext`, `GuardAccessDecision`, ...). So tipo — a implementacao vive
em `services/row-access-guard/` e nas extensoes.

### `controllers.ts`

`loadControllers()` — varre `application/features` e `extensions` por
`*.controller.ts` e importa cada default export.

### `di-registry.ts`

`registerDependencies()` — registro dinamico Contract → Implementation. Varre o
filesystem e pareia `<base>-contract.<kind>.ts` com `<base>.<kind>.ts`.

Roots varridos: `application/repositories`, `application/services`,
`application/middlewares`, `hooks` e `extensions`.

Convencao: contract = export **nomeado** `<X>Contract(Repository|Service)`;
impl = **`export default`** do arquivo irmao. `in-memory-*`, `*.worker` e
drivers nunca colidem — o impl e derivado do base do contract, nao adivinhado.

Hoje registra **108 dependencias**.

> `controllers.ts` e `di-registry.ts` continuam modulos, nao services: rodam
> antes de o container existir. `di-registry` inclusive importa `Env` de
> `start/env.ts` — transformar `Env` em service criaria ciclo.

## Verificacao

```bash
npm run di:check     # registra o grafo e resolve os services com mais arestas
npm run boot:check   # conecta no Mongo e sobe o kernel inteiro
```

O `di:check` existe porque a falha tipica deste container e **silenciosa**:
quando o SWC nao emite `design:paramtypes` (import por barrel, por exemplo), a
injecao vira `undefined` e o erro so aparece em runtime, longe da causa.

## Para onde foi o que saiu daqui

| Era | Virou |
| --- | --- |
| `field-slug.core.ts` | `services/slug/` (absorve tambem as 7 variantes de `slugify()` que estavam inline) |
| `object-id.util.ts` | `services/identifier/` |
| `csv/csv-filename.ts` | `services/date/` + `CsvExportContractService.filename()` |
| `csv/csv-format.ts` | `services/field-value/` |
| `csv/csv-stream.ts` | `services/csv-export/` |
| `row-ownership.core.ts` | `services/row-ownership/` |
| `menu-visibility.core.ts` | `services/menu-visibility/` |
| `row-payload-validator.core.ts` | `services/row-payload-validator/` |
| `row-password-helper.core.ts` | dissolvido em `services/row-password/` |
| `validations/` | `services/field-validation/rules/` |
| `logger/resolve-object-audit.ts` | `services/logger-audit/` |
| `extensions/loader.ts` + `manifest.schema.ts` | `services/extension-loader/` |
| `table/` (sandbox VM) | `services/script-execution/` |
