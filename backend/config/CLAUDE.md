# Config

Arquivos de configuracao de infraestrutura.

| Arquivo | Descricao |
|---------|-----------|
| `database.config.ts` | Abre **2 conexoes Mongoose** ao `DATABASE_URL`: (1) **system** via `mongoose.connect()` no database `DB_DATABASE` — importa todos os models para registrar schemas; (2) **data** via `mongoose.createConnection()` no database `DB_DATA_DATABASE` — exposta por `getDataConnection()` para registro de modelos dinamicos das tabelas low-code |
| `storage.config.ts` | Driver local (`_storage/`) ou AWS S3. Valores lidos de `process.env` (populados do Setting via `setting-env-sync.ts`). URL publica: `SERVER_URL/storage/filename` |
| `setting-env-sync.ts` | Sincroniza campos STORAGE_* do Setting (MongoDB) para `process.env`. Chamado no boot e apos atualizacoes |
| `redis.config.ts` | Cliente ioredis a partir de `REDIS_URL`. Log de erros de conexao |
| `email.config.ts` | Transporter Nodemailer: host, port, secure (465), requireTLS, auth |
| `util.config.ts` | `isPasswordMatch({ plain, hashed })` — compara senha via bcrypt |
