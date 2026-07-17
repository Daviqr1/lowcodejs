# start — Kernel e Configuração de Ambiente

Bootstrap da aplicação Fastify: registra todos os plugins e valida variáveis de
ambiente.

## Arquivos

| Arquivo      | Descrição                                                            |
| ------------ | -------------------------------------------------------------------- |
| `kernel.ts`  | Factory da aplicação Fastify com todos os plugins configurados       |
| `env.ts`     | Validação e tipagem de variáveis de ambiente via Zod                 |

## kernel.ts — Plugins Registrados

| Plugin                   | Configuração / Observação                                               |
| ------------------------ | ----------------------------------------------------------------------- |
| `@fastify/cors`          | Origins fixos + padrão via `ALLOWED_ORIGINS` (env)                     |
| `@fastify/cookie`        | Cookies httpOnly para armazenar JWT                                     |
| `@fastify/jwt`           | RS256, 24h de expiração, lê `JWT_PRIVATE_KEY` + `JWT_PUBLIC_KEY`       |
| `@fastify/multipart`     | Upload de arquivos com limite configurável via Settings                 |
| `@fastify/static`        | Serve arquivos locais do `_storage/` (quando STORAGE_DRIVER=local)     |
| `@scalar/fastify-api-reference` | Documentação OpenAPI em `/documentation`                        |
| `fastify-socket.io`      | WebSocket para chat em tempo real                                       |
| `fastify-decorators`     | DI de controllers via diRegistry                                        |

## Tratamento de Erros Global

O error handler global captura e normaliza:
- `HTTPException` — retorna `statusCode` e `message` estruturados
- `ZodError` — retorna 400 com lista de erros de validação
- Erros AJV — retorna 400 para falhas no schema JSON

## env.ts — Variáveis de Ambiente

Validadas com Zod. Principais grupos:

| Grupo      | Variáveis                                                                |
| ---------- | ------------------------------------------------------------------------ |
| App        | `NODE_ENV`, `PORT`, `DEMO_MODE`                                          |
| URLs       | `APP_SERVER_URL`, `APP_CLIENT_URL`                                       |
| Database   | `DATABASE_URL`, `DB_DATABASE`, `DB_DATA_DATABASE`                        |
| Auth       | `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `COOKIE_SECRET`, `COOKIE_DOMAIN`    |
| CORS       | `ALLOWED_ORIGINS`                                                        |
| Redis      | `REDIS_URL`                                                              |
| Workers    | `STORAGE_MIGRATION_CONCURRENCY`, `EMAIL_WORKER_CONCURRENCY`              |
| Scheduler  | `SCHEDULER_ENABLED` (default `true` — liga a engine de agendamentos)     |
| AI / Chat  | `MCP_SERVER_URL` (opcional)                                              |

### Configurações que **NÃO** ficam mais em env

Branding, locale, logos, upload, paginação, storage (driver/S3), SMTP e IA
(`OPENAI_API_KEY`, `AI_ASSISTANT_ENABLED`) vivem no documento Setting do
MongoDB. Editadas via UI `/settings` (usuário MASTER) ou pelo Setup Wizard.

`STORAGE_*` é sincronizado de Setting → `process.env` no boot via
`syncStorageEnv()` (`config/setting-env-sync.ts`); não precisa estar no `.env`.
