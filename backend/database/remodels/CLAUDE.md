# Remodels (manuais / destrutivos)

Remodelagens de dados **one-off, manuais e destrutivas** — o oposto das
`database/migrations/`. Ficam aqui, **fora** de `migrations/`, justamente para
não serem confundidas com "migration que faltou virar boot".

## Diferença para `database/migrations/`

| | `migrations/` | `remodels/` (aqui) |
|--|--|--|
| Roda no boot | Sim (`scripts/migrations/*.sh` no `docker-entry-point.sh`) | **Não** (sem wrapper `.sh`) |
| Idempotente | Sim (marker no Setting) | **Não** (decisão humana por alvo) |
| Destrutivo | Não (backfill/conversão segura) | **Sim** (pode apagar dado) |
| Alvo | Todo doc que casa o padrão | Tabela/grupo específico, escolhido à mão |
| Segurança | Automática | `--apply --i-have-backup`; dry-run por padrão |

**Nunca** adicione wrapper `.sh` em `scripts/migrations/` para estes arquivos —
isso os colocaria no loop de boot e rodaria a ação destrutiva sem decisão humana.

## Arquivos

| Arquivo | Propósito |
|---------|-----------|
| `migrate-fieldgroup-to-relationship.ts` | Converte um `FIELD_GROUP` usado como falso-relacionamento (subdoc embedded) numa tabela independente + `RelationshipDefinition` (1:N) + `RelationshipLink` por item. Dry-run por padrão; `--apply` exige `--i-have-backup`; `--drop-group` (destrutivo) remove o grupo/embedded da origem **após** validar contagem (item == registro == link). |

## Execução

```bash
# dry-run (só analisa, zero escrita)
node --import @swc-node/register/esm-register \
  database/remodels/migrate-fieldgroup-to-relationship.ts --table=<slug> --group=<id|slug>

# aplicar (exige backup do MongoDB antes)
node --import @swc-node/register/esm-register \
  database/remodels/migrate-fieldgroup-to-relationship.ts \
  --table=<slug> --group=<id|slug> --apply --i-have-backup

# aplicar + remover o grupo/embedded da origem (destrutivo)
node --import @swc-node/register/esm-register \
  database/remodels/migrate-fieldgroup-to-relationship.ts \
  --table=<slug> --group=<id|slug> --apply --i-have-backup --drop-group
```

Por que não pode ser boot: `FIELD_GROUP` legítimo (composição) e
falso-relacionamento têm **shape idêntico** no banco — só intenção humana os
separa. Auto-converter todos destruiria composições legítimas.

## Nota: outro path destrutivo que **fica** em `migrations/`

`migrations/01-migrate-dual-connection.ts` tem `--drop-source` (apaga as
collections do DB system após a cópia dual-connection) — também manual e
destrutivo. **Não** foi movido para cá porque a cópia (parte não-destrutiva) é
uma migration de boot: separar o arquivo quebraria o loop. O `--drop-source` é
apenas uma flag manual dentro dessa migration, com guarda própria (recusa se
`MIGRATION_DUAL_CONNECTION_AT` não foi setado).
