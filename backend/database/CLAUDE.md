# Database

Seeders para dados iniciais (`seeders/`) e migrations one-time (`migrations/`).

## Seeders (`seeders/`)

Executados em ordem pelo timestamp no nome do arquivo:

| Arquivo | Descricao |
|---------|-----------|
| `1720448435-permissions.seed.ts` | Cria 19 permissoes: 12 de tabela (E_TABLE_PERMISSION) + 7 capacidades de area (E_AREA_CAPABILITY, inclui MANAGE_CHAT). Upsert por `slug` com `$set` (metadados seguem o codigo) |
| `1720448445-user-group.seed.ts` | Cria 4 grupos: MASTER (all), ADMINISTRATOR (all), MANAGER (CRUD+VIEW), REGISTERED (VIEW+CREATE_ROW). Filtra soft-delete ao buscar permissions. Upsert por `slug`: `$set` em metadados, `$setOnInsert` em `permissions` (preserva customizacoes apos 1a criacao) |
| `1720465893-settings.seed.ts` | Cria Setting singleton. Se existe MASTER, marca SETUP_COMPLETED=true. Caso contrario, `$setOnInsert` vazio (preserva configs existentes) |
| `1778025600-demo-users.seed.ts` | **Gated por `DEMO_MODE=true`**. Cria/atualiza 2 usuarios publicos (`admin@admin.com` → ADMINISTRATOR, `registered@registered.com` → REGISTERED) com `$set` em todos os campos. Password re-hashado a cada execucao. No-op silencioso quando `DEMO_MODE=false` |
| `main.ts` | Orquestrador: descobre `*.seed.(ts|js)`, valida padrao de filename, ordena por nome, roda sequencialmente. Em falha: log + exit 1 + disconnect |

Usuario MASTER **nao** tem seed: e criado via Setup Wizard na UI na primeira execucao.

## Migrations (`migrations/`)

One-time (`NN-migrate-*.ts`), idempotentes via marcadores persistidos no
documento Setting singleton. Rodam **automaticamente** no boot Docker: o
`docker-entry-point.sh` loopa `scripts/migrations/*.sh` (que invocam o `.ts`
irmao) em ordem numerica (01→27) antes dos seeders. No 2o boot em diante sao
no-op. **Nao ha `npm run migrate:*`** — em dev local (`npm run dev`) elas nao
rodam.

A lista completa e ordenada (marker + proposito de cada uma) vive em:

- `database/migrations/CLAUDE.md` — tabela por arquivo `.ts` + marker + pattern.
- `scripts/migrations/CLAUDE.md` — wrappers `.sh`, ordem de boot e `_lib.sh`.

Fora do boot ha um remodel **manual**: `migrate-fieldgroup-to-relationship.ts`
(sem wrapper `.sh`) — converte um `FIELD_GROUP` falso-relacionamento numa tabela
independente. Destrutivo, exige `--apply --i-have-backup`.

### Execucao

```bash
# Rodar uma migration a mao (dev local ou debug) — via wrapper .sh
sh scripts/migrations/01-migrate-dual-connection.sh            # skip se ja marcado
sh scripts/migrations/01-migrate-dual-connection.sh --force    # ignora marker

# Ou direto no TS (equivalente)
node --import @swc-node/register/esm-register \
  database/migrations/01-migrate-dual-connection.ts -- --force

# Apagar collections do DB system apos a copia dual-connection
# (MANUAL, apenas apos validacao em prod + backup)
node --import @swc-node/register/esm-register \
  database/migrations/01-migrate-dual-connection.ts -- --drop-source
```

Pre-requisitos para `--drop-source` em producao:
1. Backup completo do MongoDB (`mongodump` ou snapshot)
2. App rodando ha pelo menos alguns dias com dados sendo escritos no DB data
3. Validacao de que populate de USER/FILE/RELATIONSHIP funciona normalmente

A migracao recusa drop se `MIGRATION_DUAL_CONNECTION_AT` ainda nao foi setado
(ou seja, copia nunca completou) — protege contra perda de dados.
