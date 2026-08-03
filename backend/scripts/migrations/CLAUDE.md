# scripts/migrations — Wrappers Shell das Migrations

Wrappers `.sh` numerados que executam, em ordem, as migrations one-time do
backend. São o ponto de entrada usado no boot do container: o
`docker-entry-point.sh` faz um loop sobre `scripts/migrations/*.sh` **antes**
de rodar os seeders e iniciar o servidor.

Cada `.sh` apenas localiza e invoca o arquivo TS irmão em
`backend/database/migrations/` (via `node --import @swc-node/register/esm-register`,
ou o `.js` compilado em produção) sob o usuário non-root `1001:1001`
(`su-exec` quando disponível). A **lógica e a idempotência** vivem no TS — o
shell é só orquestração e ordenação. Ver `backend/database/CLAUDE.md` para o
mecanismo de marcadores no documento Setting singleton.

O boilerplate comum (resolução de `MIGRATION_DIR`, `runas()`, dispatch `.ts`/`.js`)
vive em **`_lib.sh`**, que os wrappers fazem *source*. Cada wrapper vira só o
cabeçalho + uma chamada `run_migration "<basename>"` — ver "Convenções".

## Passos

| Ordem | Script (`.sh`) | Migration TS | O que faz |
| ----- | -------------- | ------------ | --------- |
| 01 | `01-migrate-dual-connection.sh` | `01-migrate-dual-connection.ts` | Copia collections dinâmicas do DB system (`DB_DATABASE`) para o DB data (`DB_DATA_DATABASE`), habilitando o split em 2 conexões. Marker `MIGRATION_DUAL_CONNECTION_AT` (+ `MIGRATION_DUAL_CONNECTION_DROPPED_AT` com `--drop-source`) |
| 02 | `02-migrate-group-native-fields.sh` | `02-migrate-group-native-fields.ts` | Garante campos nativos no nível raiz (`FIELD_NATIVE_LIST` + `fieldOrder*`) e em cada subtabela `FIELD_GROUP` (`FIELD_GROUP_NATIVE_LIST`), incl. auditoria `updatedAt`/`updater`. Idempotente por slug. Marker versionado `MIGRATION_NATIVE_FIELDS_AT` |
| 03 | `03-migrate-backfill-storage-location.sh` | `03-migrate-backfill-storage-location.ts` | **Wrapper desativado** (chamada comentada): o backfill de `location`/`migration_status` roda pela própria feature de storage-migration. Marker `MIGRATION_STORAGE_LOCATION_AT` |
| 04 | `04-migrate-backfill-relationship-create-records.sh` | `04-migrate-backfill-relationship-create-records.ts` | Backfilla `allowCreateRelationshipRecords=false` em Fields de relacionamento sem a propriedade (nunca sobrescreve) |
| 05 | `05-migrate-extension-slots.sh` | `05-migrate-extension-slots.ts` | Renomeia `slot` → `slots` (array) nos documentos de extensão. Marker `MIGRATION_EXTENSION_SLOTS_AT` |
| 06 | `06-migrate-relationship-table-id.sh` | `06-migrate-relationship-table-id.ts` | Backfilla `relationship.table._id` em Fields `RELATIONSHIP` sem `_id`, tornando refs slug-independentes. Marker `MIGRATION_RELATIONSHIP_TABLE_ID_AT` |
| 07 | `07-migrate-row-status-trashed.sh` | `07-migrate-row-status-trashed.ts` | Backfilla `status`/`draftAt` e remove o boolean `trashed` das rows e itens de grupo; lixeira passa a ser só `trashedAt`. Marker `MIGRATION_ROW_STATUS_TRASHED_AT` |
| 08 | `08-migrate-backfill-row-slugs.sh` | `08-migrate-backfill-row-slugs.ts` | Gera `sharedRowSlug` para rows antigas de tabelas com `rowSlugFieldId`. Markers `MIGRATION_ROW_SLUG_BACKFILL_AT` (+ `_FALLBACK_AT`) |
| 09 | `09-migrate-table-permissions.sh` | `09-migrate-table-permissions.ts` | Backfill do mapa `permissions` (10 ações) + `members` a partir de `visibility`/`owner`/`administrators` legados. Marker `MIGRATION_TABLE_PERMISSIONS_AT` |
| 10 | `10-migrate-field-permissions.sh` | `10-migrate-field-permissions.ts` | Backfill de `permissions.{list,form,detail}` a partir dos booleans `showIn*`. Não toca em `showInFilter`. Marker `MIGRATION_FIELD_PERMISSIONS_AT` |
| 11 | `11-migrate-menu-visibility.sh` | `11-migrate-menu-visibility.ts` | Define `visibility=PUBLIC` (binding visível) nos menus sem o campo. Marker `MIGRATION_MENU_VISIBILITY_AT` |
| 12 | `12-migrate-drop-legacy-permission-fields.sh` | `12-migrate-drop-legacy-permission-fields.ts` | `$unset` **permanente** dos campos legados (tabela: `visibility`/`collaboration`/`administrators`; campo: `showInList`/`showInForm`/`showInDetail` — **não** `showInFilter`). Roda depois de 09/10/11. Marker `MIGRATION_DROP_LEGACY_PERMISSION_FIELDS_AT` |
| 13 | `13-migrate-backfill-logger-audit.sh` | `13-migrate-backfill-logger-audit.ts` | Backfilla nos logs de `ROW` os campos `creator`/`updater`/`objectCreatedAt`/`objectUpdatedAt` do registro referenciado (dual-connection). Marker `MIGRATION_LOGGER_AUDIT_AT` |
| 14 | `14-migrate-relationship-lift-out-of-groups.sh` | `14-migrate-relationship-lift-out-of-groups.ts` | Promove campos `RELATIONSHIP` aninhados em `FIELD_GROUP` para top-level, unindo (dedup) os ObjectIds dos itens num array top-level. Roda ANTES de 15. Marker `MIGRATION_RELATIONSHIP_LIFT_OUT_AT` (grava só se nenhum campo falhar) |
| 15 | `15-migrate-relationship-embedded-to-links.sh` | `15-migrate-relationship-embedded-to-links.ts` | Converte relacionamento embedded (array de ObjectIds) → pivô: cria `RelationshipDefinition` + campo-espelho + um `RelationshipLink` por id; `$unset` do array. Marker `MIGRATION_RELATIONSHIP_EMBEDDED_TO_LINKS_AT` (grava só se nenhum campo divergir) |
| 16 | `16-migrate-backfill-relationship-endpoint-flags.sh` | `16-migrate-backfill-relationship-endpoint-flags.ts` | Garante a flag `visible` (top-level + `relationship.visible`) em campos `RELATIONSHIP`. Marker `MIGRATION_RELATIONSHIP_ENDPOINT_FLAGS_AT` (retido se sobrar campo não-materializado — reprocessa no próximo boot) |
| 17 | `17-migrate-relationship-links-to-fk.sh` | `17-migrate-relationship-links-to-fk.ts` | Converte links 1:1/1:N → FK single inline na row; N:N segue no pivô. Roda depois de 15/16. Marker `MIGRATION_RELATIONSHIP_LINKS_TO_FK_AT` (grava só sem conflito) |
| 18 | `18-migrate-backfill-relationship-mirror.sh` | `18-migrate-backfill-relationship-mirror.ts` | Grava o espelho denormalizado `relationship.mirror` (multiple/visible/label do lado oposto). Roda depois de 16/17. Marker `MIGRATION_RELATIONSHIP_MIRROR_AT` |
| 19 | `19-migrate-field-validations.sh` | `19-migrate-field-validations.ts` | Backfilla `validations: []` em Field docs sem a propriedade (camada única de validação). Não deriva do `format` (legado segue validando). Marker `MIGRATION_FIELD_VALIDATIONS_AT` |
| 20 | `20-migrate-backfill-extension-table-settings.sh` | `20-migrate-backfill-extension-table-settings.ts` | Garante `tableSettings: {}` (Mixed) nos Extension docs antigos. Marker `MIGRATION_EXTENSION_TABLE_SETTINGS_AT` |
| 21 | `21-migrate-auth-multi-account.sh` | `21-migrate-auth-multi-account.ts` | **Marcadora (no-op)**: sessões multi-conta são 100% cookies indexados; nada persistido a migrar. Marker `MIGRATION_AUTH_MULTI_ACCOUNT_AT` só para trilha de versão |
| 22 | `22-migrate-row-access-guard.sh` | `22-migrate-row-access-guard.ts` | **Marcadora (no-op)**: row-access é avaliado em runtime + backfill em bind-time (`onTableBound`). Marker `MIGRATION_ROW_ACCESS_GUARD_AT` só para trilha de versão |
| 23 | `23-migrate-relationship-repair-unmaterialized.sh` | `23-migrate-relationship-repair-unmaterialized.ts` | Reconstrói links FK-inline a partir do embedded sobrevivente e materializa campos `RELATIONSHIP` que caíram no vão de 14/15. Marker `MIGRATION_RELATIONSHIP_REPAIR_AT` |
| 24 | `24-migrate-field-label-to-object.sh` | `24-migrate-field-label-to-object.ts` | Converte `field.label` string → objeto por contexto `{list,filter,form,detail}`. Marker `MIGRATION_FIELD_LABEL_TO_OBJECT_AT` |
| 25 | `25-migrate-relationship-backfill-form-mode.sh` | `25-migrate-relationship-backfill-form-mode.ts` | Backfilla `formMode='manage'` em campos-espelho N:N. Marker `MIGRATION_RELATIONSHIP_FORM_MODE_AT` |
| 26 | `26-migrate-relationship-cleanup-broken-definitions.sh` | `26-migrate-relationship-cleanup-broken-definitions.ts` | Quarentena campos-espelho cujas `RelationshipDefinitions` apontam para tabelas inexistentes. Marker `MIGRATION_RELATIONSHIP_BROKEN_DEFINITIONS_AT` |
| 27 | `27-migrate-repair-owns-fk.sh` | `27-migrate-repair-owns-fk.ts` | Restaura FKs inline OWNS_FK (1:1/1:N) apagadas pela migration 23 e remove os links criados por ela. Marker `MIGRATION_REPAIR_OWNS_FK_AT` |
| 28 | `28-migrate-relationship-dedup-consolidate.sh` | `28-migrate-relationship-dedup-consolidate.ts` | Consolida `RelationshipDefinitions` duplicadas por campo source (e os campos-espelho `-1`…`-N` no target). Marker `MIGRATION_RELATIONSHIP_DEDUP_AT` |
| 29 | `29-migrate-sanitize-field-slugs.sh` | `29-migrate-sanitize-field-slugs.ts` | Renomeia slugs de campo com caracteres especiais (legado do `slugify` sem `strict`) que quebravam o update path do Mongo (`EmptyFieldName`, code 56). Move os valores das rows para a chave nova. Aceita `--dry-run`. Marker `MIGRATION_FIELD_SLUG_SANITIZE_AT` |

## Fluxo

```
docker-entry-point.sh:
  for script in scripts/migrations/*.sh; do
    case "$(basename "$script")" in _*) continue ;; esac   # pula helpers (_lib.sh)
    sh "$script" $FORCE_FLAG                                 # ordem 01→27
  done
  npm run seed                                              # seeders idempotentes
  exec <server>                                             # inicia a API
```

`run_migration` (em `_lib.sh`) resolve `MIGRATION_DIR` (`/app/database/migrations`
no container, ou caminho relativo em dev) e prefere o `.ts` quando presente,
caindo para o `.js` compilado.

## Convenções

- **Numeração = ordem de execução**: o loop usa glob ordenado. Novas migrations
  ganham o próximo número (`28-migrate-...`).
- **Boilerplate em `_lib.sh`**: todo wrapper faz `. "$(dirname "$0")/_lib.sh"` e
  chama `run_migration "<basename-sem-.sh>" "$@"`. O basename tem que casar o
  nome do `.ts` irmão. O loop do entrypoint **pula arquivos `_*`**, então
  `_lib.sh` nunca roda sozinho (é só sourced).
- **Idempotência sempre no TS**: skip via marker no Setting (ou checagem de
  presença). Rodar o loop N vezes deve ser no-op a partir da 2ª.
- **`set -e`**: qualquer falha aborta o boot do container.

## Rodar avulso (sem Docker)

**Não existem** `npm run migrate:*` — migrations rodam só pelo loop do boot
Docker. Em dev local (`npm run dev`) elas **não** rodam. Para rodar uma à mão:

```sh
# via wrapper (resolve dir + usuário non-root)
sh scripts/migrations/06-migrate-relationship-table-id.sh
sh scripts/migrations/06-migrate-relationship-table-id.sh --force   # ignora marker

# direto no TS (equivalente)
node --import @swc-node/register/esm-register \
  database/migrations/06-migrate-relationship-table-id.ts -- --force
```

## Gotchas

- `03-migrate-backfill-storage-location.sh` está com a chamada `run_migration`
  **comentada**: o backfill roda pela feature de storage-migration. Não reative
  sem confirmar que a feature não o cobre.
- Comentários no topo de cada `.sh` documentam propósito, marker e
  idempotência — mantenha-os ao editar (só o corpo vira `source + run_migration`).
- As migrations de relacionamento (14→18, 23, 25→27) têm dependência de ordem
  entre si — respeite a numeração ao criar novas no mesmo domínio.
