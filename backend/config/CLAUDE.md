# Config

Sobrou **um** arquivo. Os outros cinco viraram services em
`application/services/`, porque configuracao com comportamento (memoizar
cliente, abrir conexao, montar transporter) e comportamento, nao configuracao.

| Arquivo | Descricao |
|---------|-----------|
| `database.config.ts` | Abre **2 conexoes Mongoose** ao `DATABASE_URL`: (1) **system** via `mongoose.connect()` no database `DB_DATABASE` — importa todos os models para registrar schemas; (2) **data** via `mongoose.createConnection()` no database `DB_DATA_DATABASE` — exposta por `getDataConnection()` para os modelos dinamicos das tabelas low-code |

> `database.config.ts` continua modulo porque `getDataConnection()` e chamado de
> dentro de migrations e seeders, que rodam fora do container. E o proximo alvo:
> e esse singleton de conexao, nao os repositories, que trava trocar Mongo por
> um banco relacional.

## Para onde foram os outros

| Era | Virou |
| --- | --- |
| `storage.config.ts` | `services/storage-config/` (junto com o cache de metadado e o `content-disposition`) |
| `redis.config.ts` | `services/redis/` — a conexao compartilhada deixou de ser aberta em tempo de import |
| `email.config.ts` | `services/email-config/` |
| `setting-env-sync.ts` | `services/setting-env-sync/` |
| `util.config.ts` | **deletado** — `isPasswordMatch` nao tinha consumidor e duplicava `BcryptPasswordService.compare` |
