# LowCodeJS Backend

Plataforma low-code construida com Fastify + TypeScript + MongoDB.

## Tech Stack

| Tecnologia | Versao | Uso |
|------------|--------|-----|
| Fastify | 5.6.0 | HTTP framework |
| TypeScript | 5.9.2 | Linguagem |
| MongoDB + Mongoose | 8.18.1 | Banco de dados + ODM |
| Redis (ioredis) | 5.10.1 | Cache |
| Socket.IO | 4.8.3 | WebSocket (chat) |
| Zod | 4.1.5 | Validacao |
| AJV | - | Validacao Fastify schema |
| JWT (RS256) | - | Autenticacao |
| Flydrive | 2.1.0 | Storage (local/S3) |
| Sharp | 0.34.5 | Processamento de imagem |
| Nodemailer | 7.0.11 | Email |
| Vitest | 4.0.16 | Testes (unit + e2e) |
| fastify-decorators | 3.16.1 | DI + Controller decorators |

## Arquitetura

```mermaid
graph TD
    Client[Cliente HTTP] --> Middleware
    Middleware --> Controller
    Controller --> Validator[Validator - Zod]
    Controller --> UseCase[Use Case]
    UseCase --> Repository[Repository Contract]
    Repository --> Mongoose[Mongoose Implementation]
    Mongoose --> SystemDB[(MongoDB - DB_DATABASE<br/>users, tables, fields, settings...)]
    Mongoose --> DataDB[(MongoDB - DB_DATA_DATABASE<br/>collections dinâmicas via getDataConnection)]
    UseCase --> Service[Service Contract]
    Service --> EmailImpl[Nodemailer / Storage / etc]
```

A aplicação usa **2 conexões MongoDB**: uma para os models de sistema (default
via `mongoose.connect()`) e outra isolada (`mongoose.createConnection()`,
exposta por `getDataConnection()`) para as collections dinâmicas das tabelas
low-code. Ver seção "Banco de Dados" e `config/database.config.ts`.

## Estrutura de Diretorios

```
backend/
├── bin/server.ts                  # Entry point - inicia Mongoose + HTTP + Socket.IO
├── start/
│   ├── kernel.ts                  # Fastify kernel - plugins, CORS, JWT, Swagger, error handler
│   └── env.ts                     # Validacao de env vars com Zod
├── config/
│   ├── database.config.ts         # 2 conexoes Mongoose (system + data via getDataConnection)
│   ├── storage.config.ts          # Flydrive (local/S3)
│   ├── redis.config.ts            # ioredis
│   └── email.config.ts            # Nodemailer transporter
├── application/
│   ├── core/                      # Logica central (entity types, Either, exception, builders, sandbox)
│   ├── middlewares/               # Auth JWT + Table access/permissions
│   ├── model/                     # Mongoose schemas (11 models, todos no DB system)
│   ├── repositories/              # Contract + Mongoose + InMemory (11 entidades)
│   ├── services/                  # Email (contract + nodemailer + in-memory), Storage (flydrive)
│   ├── utils/                     # JWT tokens, cookies
│   └── resources/                 # 16 recursos REST (cada um com operacoes isoladas)
├── database/
│   ├── seeders/                   # Permissions, user groups, settings (idempotente)
│   └── migrations/                # Migracoes one-time (dual-connection)
├── docker-entrypoint.sh           # Roda migrations + seeders antes do server
├── extensions/                    # Pacotes de extensões (plugins/modules/tools) — ver extensions/CLAUDE.md
├── templates/email/               # EJS templates (notification, sign-up)
└── test/                          # Setup, helpers (auth)
```

## Responsabilidades por Camada

### Controller (`*.controller.ts`)
- **SOMENTE** HTTP: parse request, chamar validator, delegar ao use-case, formatar response
- Recebe injecao de middleware via decorator `onRequest`
- NAO contem logica de negocio
- Retorna status codes adequados (201 create, 200 success, etc)

### Validator (`*.validator.ts`)
- Schemas Zod para validacao de input (body, params, query)
- Exporta tipos inferidos (`z.infer<typeof schema>`)
- Validators base reutilizaveis (ex: `user-base.validator.ts`)
- Schema files (`*.schema.ts`) sao para documentacao OpenAPI, nao runtime

### Use Case (`*.use-case.ts`)
- Logica de negocio pura
- Retorna `Either<HTTPException, T>` (Left = erro, Right = sucesso)
- Recebe repositorios via constructor injection (`@Inject`)
- NAO conhece HTTP (request/response)
- Trata excecoes internas e retorna Left com codigo/causa

### Repository (`*-contract.repository.ts` + `*-mongoose.repository.ts`)
- Contract: classe abstrata definindo interface
- Mongoose: implementacao concreta
- InMemory: para testes unitarios
- Metodos padrao: `create`, `findById`, `findByX`, `findMany`, `update`, `delete`, `count`
- Payloads tipados (CreatePayload, UpdatePayload, QueryPayload, FindOptions)

### Service (`*-contract.service.ts` + implementacao)
- Cross-cutting concerns: email, storage
- Mesmo pattern contract + implementation do repository
- Registrado no DI via `di-registry.ts`

### Middleware
- `authentication.middleware.ts` - Extrai JWT de cookie/header, popula `request.user`
- `table-access.middleware.ts` - Verifica permissoes RBAC + visibilidade de tabela

### Model (`*.model.ts`)
- Mongoose schemas com timestamps
- Soft delete: campos `trashed` (boolean) + `trashedAt` (Date)
- Virtual fields (ex: `url` em Storage)

## Padroes de Design

### Either/Result Pattern
```typescript
// Use-case retorna Either<Error, Success>
const result = await useCase.execute(input);
if (result.isLeft()) return response.status(result.value.code).send(result.value);
return response.status(200).send(result.value);
```

### Repository Contract Pattern
```typescript
// Contract (abstrata)
abstract class UserContractRepository {
  abstract create(payload: UserCreatePayload): Promise<IUser>;
  abstract findById(_id: string, options?: FindOptions): Promise<IUser | null>;
  abstract findByEmail(email: string, options?: FindOptions): Promise<IUser | null>;
}

// DI Registry (di-registry.ts)
injectablesHolder.injectService(UserContractRepository, UserMongooseRepository);
```

### Soft Delete
Todas as entidades usam `trashed: boolean` + `trashedAt: Date | null`. Dados nunca sao hard-deleted (exceto via operacoes especificas como `hard-delete` no menu).

### Dynamic Schema
Tabelas possuem `_schema` (Mixed) que e convertido em runtime para modelos Mongoose via `buildTable()`. Permite criar tabelas dinamicas no low-code.

### Script Sandbox
Codigo de usuario (beforeSave, afterSave, onLoad) roda em Node VM isolada com timeout de 5s. APIs disponiveis: `field`, `context`, `email`, `utils`, `console`.

## Enums Core (`entity.core.ts`)

| Enum | Valores |
|------|---------|
| `E_ROLE` | MASTER, ADMINISTRATOR, MANAGER, REGISTERED |
| `E_FIELD_TYPE` | TEXT_SHORT, TEXT_LONG, DROPDOWN, DATE, RELATIONSHIP, FILE, FIELD_GROUP, REACTION, EVALUATION, CATEGORY, USER + nativos |
| `E_FIELD_FORMAT` | ALPHA_NUMERIC, INTEGER, DECIMAL, URL, EMAIL, PASSWORD, PHONE, CNPJ, CPF, RICH_TEXT, PLAIN_TEXT + date formats |
| `E_TABLE_TYPE` | TABLE, FIELD_GROUP |
| `E_TABLE_STYLE` | LIST, GALLERY, DOCUMENT, CARD, MOSAIC, KANBAN, FORUM, CALENDAR, GANTT |
| `E_TABLE_VISIBILITY` | PUBLIC, RESTRICTED, OPEN, FORM, PRIVATE |
| `E_TABLE_COLLABORATION` | OPEN, RESTRICTED |
| `E_TABLE_PERMISSION` | CREATE/UPDATE/REMOVE/VIEW para TABLE, FIELD, ROW (12 total) |
| `E_JWT_TYPE` | ACCESS, REFRESH |
| `E_USER_STATUS` | ACTIVE, INACTIVE |

## Sistema de Permissoes (RBAC)

| Role | Permissoes |
|------|-----------|
| MASTER | Todas (bypassa checks) |
| ADMINISTRATOR | Todas (acesso a todas as tabelas) |
| MANAGER | CRUD + VIEW (respeita ownership) |
| REGISTERED | VIEW + CREATE_ROW apenas |

Visibilidade de tabela (para nao-owners):
- **PUBLIC**: GET view liberado para visitantes
- **FORM**: POST create liberado para visitantes
- **OPEN**: VIEW + CREATE_ROW
- **RESTRICTED**: VIEW only
- **PRIVATE**: bloqueado

## Convencoes de Nomenclatura

| Tipo | Pattern | Exemplo |
|------|---------|---------|
| Controller | `{operacao}.controller.ts` | `create.controller.ts` |
| Use Case | `{operacao}.use-case.ts` | `create.use-case.ts` |
| Validator | `{operacao}.validator.ts` | `create.validator.ts` |
| Schema (docs) | `{operacao}.schema.ts` | `create.schema.ts` |
| Unit Test | `{operacao}.use-case.spec.ts` | `create.use-case.spec.ts` |
| E2E Test | `{operacao}.controller.spec.ts` | `create.controller.spec.ts` |
| Repository Contract | `{entidade}-contract.repository.ts` | `user-contract.repository.ts` |
| Repository Impl | `{entidade}-mongoose.repository.ts` | `user-mongoose.repository.ts` |
| Repository Test | `{entidade}-in-memory.repository.ts` | `user-in-memory.repository.ts` |
| Service Contract | `{nome}-contract.service.ts` | `email-contract.service.ts` |
| Service Impl | `{tech}-{nome}.service.ts` | `nodemailer-email.service.ts` |
| Model | `{entidade}.model.ts` | `user.model.ts` |
| Validator Base | `{entidade}-base.validator.ts` | `user-base.validator.ts` |

## Comandos CLI

```bash
npm run dev          # Dev mode (watch + SWC)
npm run build        # tsc + tsup -> /build
npm run seed         # Seeders (permissions, groups, users)
npm run test         # Vitest (todos)
npm run test:unit    # Vitest unit (*.use-case.spec.ts, *.service.spec.ts)
npm run test:e2e     # Vitest e2e (*.controller.spec.ts) - MongoDB real, 1 worker
npm run test:coverage # Coverage (V8)
npm run lint         # ESLint --fix
npm start            # Producao (build/bin/server.js)
```

## Formato de Resposta

### Sucesso
```json
{ "data": [...], "meta": { "total": 100, "page": 1, "perPage": 10, "lastPage": 10, "firstPage": 1 } }
```

### Erro
```json
{ "message": "Not found", "code": 404, "cause": "TABLE_NOT_FOUND", "errors": { "campo": "mensagem" } }
```

## Dependencia Injection (DI)

Registrado em `application/core/di-registry.ts` usando `fastify-decorators`:
- 11 repositorios: User, UserGroup, Permission, Table, Field, Storage, ValidationToken, Menu, Reaction, Evaluation, Setting
- 1 servico: Email (contract -> nodemailer)

Para adicionar nova dependencia:
1. Crie o contract (abstract class)
2. Crie a implementacao
3. Registre em `di-registry.ts` com `injectablesHolder.injectService(Contract, Implementation)`

## Fluxo de Inicializacao do Servidor

```
bin/server.ts:
1. MongooseConnect() - abre as 2 conexoes (system via mongoose.connect, data via createConnection)
2. kernel.ready() - inicializa Fastify com todos os plugins
3. kernel.listen({ port: Env.PORT, host: '0.0.0.0' })
4. initChatSocket(httpServer, jwtDecode) - Socket.IO para chat
```

Em container Docker, o `docker-entrypoint.sh` roda ANTES do servidor:
1. `npm run migrate:dual-connection` (idempotente — no-op se ja migrado)
2. `npm run seed` (idempotente — upsert)
3. Inicia o servidor

kernel.ts registra 9 plugins em ordem:

1. CORS (origens dinamicas + fixas de ALLOWED_ORIGINS)
2. Cookie (signed com COOKIE_SECRET)
3. JWT (RS256 com chaves base64, expiry 24h)
4. Multipart (limite 5MB)
5. Static files (local) OU HTTP proxy (S3) - baseado em STORAGE_DRIVER
6. Swagger/OpenAPI
7. Scalar API reference (/documentation)
8. WebSocket
9. fastify-decorators bootstrap (carrega controllers)

Global error handler: HTTPException -> ZodError -> FST_ERR_VALIDATION -> fallback 500

Endpoint: /openapi.json

## Variaveis de Ambiente

Validadas em `start/env.ts` com Zod. Carrega `.env` em dev/prod, `.env.test` em test.

O `.env` agora cobre apenas infraestrutura (DB, JWT, cookies, CORS, storage
driver, Redis, MCP). Configurações de domínio (branding, locale, upload,
paginação, logos, IA, SMTP) vivem no documento Setting do MongoDB e são
editadas via UI `/settings` pelo usuário MASTER.

### Banco de Dados

A aplicacao usa **duas conexoes MongoDB** apontando para databases distintos no
mesmo servidor (configuravel para servidores separados via `DATABASE_URL`):

- **System** (`DB_DATABASE`): collections nativas (User, UserGroup, Permission,
  Table, Field, Storage, ValidationToken, Menu, Reaction, Evaluation, Setting).
  Conexao default via `mongoose.connect()`.
- **Data** (`DB_DATA_DATABASE`): collections dinamicas criadas pelo usuario
  no low-code. Cada `table.slug` vira uma collection. Conexao isolada via
  `mongoose.createConnection()`, exposta por `getDataConnection()`.

| Variavel | Default | Descricao |
|----------|---------|-----------|
| DATABASE_URL | obrigatorio | MongoDB connection string |
| DB_DATABASE | lowcodejs | Nome do database **system** |
| DB_DATA_DATABASE | lowcodejs_data | Nome do database **data** (collections dinamicas) |

### Email (SMTP)

Configurado pela UI `/settings` (usuario MASTER) e persistido no documento
Setting do MongoDB. Campos: `EMAIL_PROVIDER_HOST`, `EMAIL_PROVIDER_PORT`,
`EMAIL_PROVIDER_USER`, `EMAIL_PROVIDER_PASSWORD`, `EMAIL_PROVIDER_FROM`
(todos nullable). Se qualquer credencial essencial estiver ausente, o
`NodemailerEmailService` retorna `{ success: false, message: 'SMTP nao
configurado' }` sem lancar erro.

### JWT & Cookies

| Variavel | Default | Descricao |
|----------|---------|-----------|
| JWT_PUBLIC_KEY | obrigatorio | Chave publica RS256 em base64 |
| JWT_PRIVATE_KEY | obrigatorio | Chave privada RS256 em base64 |
| COOKIE_SECRET | obrigatorio | Secret para cookies assinados |
| COOKIE_DOMAIN | opcional | Cross-subdomain |

### Servidor

| Variavel | Default | Descricao |
|----------|---------|-----------|
| NODE_ENV | development | Ambiente |
| PORT | 3000 | Porta HTTP |
| APP_SERVER_URL | obrigatorio | URL publica do backend |
| APP_CLIENT_URL | obrigatorio | URL publica do frontend |

### CORS

| Variavel | Default | Descricao |
|----------|---------|-----------|
| ALLOWED_ORIGINS | https://lowcodejs.org;*.lowcodejs.org | Origens permitidas |

### Storage

Configurado via Setup Wizard ou Settings na UI (MASTER). Vive no documento
Setting do MongoDB. Campos: `STORAGE_DRIVER` ('local'|'s3'),
`STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`,
`STORAGE_SECRET_KEY`. No boot, `bin/server.ts` carrega do DB e sincroniza para
`process.env` via `syncStorageEnv()`.

#### Migração de arquivos entre drivers

Quando o MASTER troca `STORAGE_DRIVER` (local↔s3) na UI, os arquivos
existentes ficam órfãos no driver antigo. O recurso `storage-migration`
copia esses arquivos para o driver atual em background, mantendo zero downtime.

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/storage/migration/status` | GET | Contagens por driver/status, job ativo, can_cleanup |
| `/storage/migration/start` | POST | Enfileira job de migração (body: `{concurrency?, retry_failed_only?}`) |
| `/storage/migration/cleanup` | POST | Apaga arquivos do driver antigo (body: `{confirm: true}`) |

Todos restritos ao role MASTER via `RoleMiddleware`. Progresso em tempo real
via WebSocket no namespace `/storage-migration` (mesmo Socket.IO server do
chat). Eventos: `progress`, `file_migrated`, `file_failed`, `completed`,
`error`.

**Arquitetura:** BullMQ (Redis) para a fila + worker in-process iniciado em
`bin/server.ts`. Storage docs ganham campos `location` e `migration_status`
(`storage.model.ts`). Kernel hook (`start/kernel.ts`) faz dual-read fallback:
serve do driver indicado em `doc.location`, com cross-driver fallback caso o
arquivo não esteja onde o cache acha que está.

**Resiliência:**
- BullMQ persiste jobs no Redis — restart do worker retoma de onde parou.
- Worker pula docs já com `location === target_driver` (idempotente).
- Sweeper de boot marca docs órfãos `in_progress` como `failed` quando não há
  job ativo (recovery após crash).
- Cada arquivo tem 3 tentativas com backoff linear; falhas vão para
  `migration_status='failed'` e podem ser retentadas via
  `retry_failed_only: true`.

**Backfill:** `database/migrations/migrate-backfill-storage-location.ts` popula
o campo `location` em docs Storage existentes (idempotente via marker
`MIGRATION_STORAGE_LOCATION_AT` no Setting). Roda automaticamente no
`docker-entrypoint.sh`.

| Variavel | Default | Descricao |
|----------|---------|-----------|
| STORAGE_MIGRATION_CONCURRENCY | 5 | Arquivos copiados em paralelo (1-20) |

### Redis

| Variavel | Default | Descricao |
|----------|---------|-----------|
| REDIS_URL | redis://localhost:6379 | URL de conexao Redis |

### AI/Chat

| Variavel | Default | Descricao |
|----------|---------|-----------|
| MCP_SERVER_URL | opcional | URL do servidor MCP |

`OPENAI_API_KEY` e `AI_ASSISTANT_ENABLED` vivem no Setting do MongoDB (UI
`/settings`). O `chat.socket` le do model em cada conexao, sem depender de
`process.env`.

## Error Handling

- `HTTPException`: classe que estende Error, ~40 metodos factory estaticos (BadRequest, Unauthorized, NotFound, Forbidden, etc.)
- Propriedades: `code` (HTTP status), `cause` (error code string), `message`, `errors?` (field-level)
- **Todas as mensagens de erro devem ser em PT-BR**
- `BadRequest` e `Unauthorized` aceitam `errors?: Record<string, string>` como 3o argumento para erros por campo
- Controllers devem propagar errors: `...(error.errors && { errors: error.errors })`
- Response schemas (`*.schema.ts`) devem incluir `errors` em todos os blocos de erro para que o Fastify nao remova a propriedade na serializacao
- Global handler em kernel.ts captura:
  1. **HTTPException** -> retorna direto com code/cause/message/errors
  2. **ZodError** -> flatten para field errors, retorna 400 INVALID_PAYLOAD_FORMAT
  3. **FST_ERR_VALIDATION** -> flatten de erros AJV
  4. **Fallback** -> 500 SERVER_ERROR

## Infraestrutura de Testes

| | Unit | E2E |
|---|---|---|
| Config | vitest.config.ts | vitest.e2e.config.ts |
| Setup | test/setup.ts (reflect-metadata) | test/setup.e2e.ts (MongoDB por suite, DB unico test_{uuid}) |
| Banco | In-memory repositories | MongoDB real |
| Workers | Default | 1 (maxWorkers: 1) |
| Timeout | Default | 60s |
| Pattern | *.use-case.spec.ts | *.controller.spec.ts |
| Runner | threads | forks |

Helpers (`test/helpers/auth.helper.ts`):
- `createAuthenticatedUser(overrides?)` - cria user + grupo Master + 12 permissoes, faz sign-in, retorna cookies + user
- `cleanDatabase()` - deleta User e UserGroup

## Build & Deploy

- **Build**: `tsc -b && tsup` -> /build (ESM, ES2024, sem bundle de node_modules)
- **Dev**: @swc-node/register para transpilacao rapida
- 3 Dockerfiles:
  - `Dockerfile-local`: node:24-alpine, npm run dev
  - `Dockerfile-production`: node:24-alpine, copia /build, usuario non-root (1001), porta 3000
  - `Dockerfile-coolify`: multi-stage otimizado

## Socket.IO / Chat

- Arquivo: `application/resources/chat/chat.socket.ts`
- Auth: cookie accessToken (mesmo JWT do HTTP)
- Integra MCP (Model Context Protocol) + OpenAI
- Descobre tools do MCP server dinamicamente, converte para OpenAI tool definitions
- Eventos emitidos: `status`, `ready`, `thinking`, `tool_call`, `tool_result`, `tool_error`, `message`, `error`
- Processamento de arquivos: imagens -> base64 data URI, PDFs -> text extraction via pdf-parse
- CORS: APP_CLIENT_URL + APP_SERVER_URL + ALLOWED_ORIGINS

## Sandbox VM (Scripts de Usuario)

- Arquivos: `application/core/table/` (executor.ts, handler.ts, sandbox.ts, field-resolver.ts, types.ts)
- Timeout: 5s, VM Node isolada sem acesso a globals (require, fs, network bloqueados)
- Valida sintaxe antes de executar

### APIs Expostas

| API | Metodos | Descricao |
|-----|---------|-----------|
| field | get(slug), set(slug, value), getAll() | Leitura/escrita de campos do registro |
| context | action, moment, userId, isNew, table | Contexto de execucao (read-only, frozen) |
| email | send(to[], subject, body), sendTemplate(to[], subject, message, data?) | Envio de email |
| utils | today(), now(), formatDate(date, format?), sha256(text), uuid() | Utilitarios |
| console | log(), warn(), error() | Logs capturados e retornados |

### Context Values

- **action**: novo_registro, editar_registro, excluir_registro, carregamento_formulario
- **moment**: carregamento_formulario, antes_salvar, depois_salvar

### Retorno

`ExecutionResult { success, error?, logs[] }`

Tipos de erro: syntax, runtime, timeout, unknown

## Cookie/JWT

- Algoritmo: RS256 com chaves base64 (JWT_PUBLIC_KEY, JWT_PRIVATE_KEY)
- AccessToken: 24h, payload `{ sub, email, role, type: "ACCESS" }`
- RefreshToken: 7d, payload `{ sub, type: "REFRESH" }`
- Cookies: httpOnly, sameSite none(prod)/lax(dev), secure(prod), path /
- COOKIE_DOMAIN opcional para cross-subdomain
- Extracao: 1. Cookie value, 2. Authorization header (fallback)
- Validacao: verifica type === ACCESS (rejeita REFRESH em rotas normais)

## Configuracoes (config/)

| Arquivo | Tecnologia | Detalhes |
|---------|-----------|----------|
| database.config.ts | Mongoose | autoCreate: true, dbName de ENV, importa todos os models |
| storage.config.ts | Flydrive DriveManager | Local: _storage/ + URLs via APP_SERVER_URL/storage/. S3: AWS SDK |
| redis.config.ts | ioredis | Conexao via REDIS_URL, error logging |
| email.config.ts | Nodemailer | SMTP, auto-secure se porta 465, TLS obrigatorio |

## Seeders

Execucao: `database/seeders/main.ts` encontra `*.seed.(ts|js)`, valida padrao de filename, ordena por nome (timestamp) e executa sequencialmente. Em falha: log do arquivo que falhou, `process.exit(1)`, `mongoose.disconnect()`.

Comando: `npm run seed`

| Seeder | Dados |
|--------|-------|
| 1720448435-permissions.seed.ts | 12 permissoes (CREATE/UPDATE/REMOVE/VIEW para TABLE, FIELD, ROW). Upsert por `slug` com `$set` |
| 1720448445-user-group.seed.ts | 4 grupos (MASTER, ADMINISTRATOR, MANAGER, REGISTERED). Metadados via `$set`; `permissions` via `$setOnInsert` (preserva customizacoes manuais) |
| 1720465893-settings.seed.ts | Setting singleton. Marca SETUP_COMPLETED=true se ja existe MASTER; caso contrario, `$setOnInsert: {}` |

Usuario MASTER **nao** tem seed — e criado via Setup Wizard na UI na primeira execucao.

## Extensões (Plugins / Módulos / Ferramentas)

Mecanismo build-time + ativação runtime para estender a plataforma sem mexer
no core. Documentação canônica em `backend/extensions/CLAUDE.md`.

- **Diretório**: `backend/extensions/<pkg>/{plugins,modules,tools}/<id>/manifest.json`
- **Loader**: `application/core/extensions/loader.ts` varre o FS no boot,
  valida manifests via Zod e faz upsert na collection `extensions`
- **Model + Repo**: `Extension` (system DB), com chave única `(pkg, type,
  extensionId)` e flags `enabled` / `available`
- **REST**: `/extensions` (list, toggle, configure-table-scope) — MASTER only
- **Guarda runtime**: `ExtensionActiveMiddleware({ pkg, type, extensionId })`
  retorna 404 quando a extensão está desativada/indisponível
- **Sem sandbox**: extensões rodam com privilégios totais — desenvolvedores
  internos assumem o risco

## Migrations

Execucao: `database/migrations/migrate-dual-connection.ts`. Migracao one-time
(idempotente via marcadores no Setting singleton) que copia as collections
dinamicas do DB system para o DB data. Roda automaticamente no
`docker-entrypoint.sh`; no segundo boot em diante e no-op com 1 query.

Comandos:
- `npm run migrate:dual-connection` — copia (skip se `MIGRATION_DUAL_CONNECTION_AT` ja setado)
- `npm run migrate:dual-connection -- --force` — re-executa ignorando marcador
- `npm run migrate:dual-connection -- --drop-source` — apaga collections do DB
  system apos copia (manual, executar apenas apos validar em producao + backup)

Marcadores persistidos no Setting:
- `MIGRATION_DUAL_CONNECTION_AT` — timestamp da copia bem-sucedida
- `MIGRATION_DUAL_CONNECTION_DROPPED_AT` — timestamp do drop bem-sucedido
