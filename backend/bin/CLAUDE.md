# bin — Entry Point do Servidor

Inicialização da aplicação: conecta ao banco, sincroniza configurações do Setting
para `process.env`, sobe o Fastify e registra os namespaces Socket.IO + workers.

## Arquivos

| Arquivo     | Descrição                                                                 |
| ----------- | ------------------------------------------------------------------------- |
| `server.ts` | Boot completo: Mongoose → sync de settings → Fastify → sockets → workers |

## Fluxo de Inicialização (`server.ts`)

1. `MongooseConnect()` — abre as **2 conexões** (system + data).
2. `syncSettingsFromDatabase()` — copia `SETTING_SYNC_KEYS` (SYSTEM_NAME, LOCALE,
   FILE_UPLOAD_*, PAGINATION_PER_PAGE, EMAIL_PROVIDER_*, LOGO_*, OPENAI_API_KEY,
   AI_ASSISTANT_ENABLED) do Setting para `process.env`.
3. `start()`:
   - `loadStorageConfig()` → `syncStorageEnv(setting)` (campos STORAGE_* →
     `process.env`; ver `config/setting-env-sync.ts`).
   - `kernel.ready()` + `kernel.listen({ port, host: '0.0.0.0' })`.
   - Inicializa os namespaces Socket.IO (mesmo JWT RS256 do HTTP): `chat`,
     `/storage-migration`, `/notifications`, table-import, `/csv-import`.
   - `sweepStaleMigrations()` — recovery pós-crash (marca órfãos `in_progress`
     como `failed`).
   - Inicia os workers in-process: storage-migration, email, csv-import.

## Observações

- Diferente de `.env` (infra: DB/JWT/cookies/CORS/Redis/MCP), as **configurações
  de domínio** vivem no documento Setting e são sincronizadas para `process.env`
  no boot pelos passos 2-3 (e relidas dinamicamente pelas camadas que precisam).
- RowAccessGuard e demais deps fluem por DI (`@Service` + `di-registry`) — sem
  wiring manual aqui.
- O `/* eslint-disable import/order */` no topo é intencional: a ordem dos imports
  (com `reflect-metadata` primeiro) importa para os side-effects do boot.
