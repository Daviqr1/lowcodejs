# Migrations

Migracoes one-time para o MongoDB. Idempotentes via marcadores no documento
Setting (singleton). Rodam automaticamente no `docker-entry-point.sh` antes do
servidor subir (loop sobre `scripts/migrations/*.sh`); no segundo boot em diante
sao no-op com 1 query. Ver `scripts/migrations/CLAUDE.md` para a lista completa
e ordenada dos wrappers.

## Arquivos

| Arquivo | Marker no Setting | Proposito |
|---------|-------------------|-----------|
| `01-migrate-dual-connection.ts` | `MIGRATION_DUAL_CONNECTION_AT` (+ `MIGRATION_DUAL_CONNECTION_DROPPED_AT` com `--drop-source`) | Copia collections dinamicas do DB **system** para o DB **data**. Habilita o split em 2 conexoes Mongoose. |
| `02-migrate-group-native-fields.ts` | `MIGRATION_NATIVE_FIELDS_AT` (versionado; idempotente por slug) | Garante campos nativos no nivel raiz (`FIELD_NATIVE_LIST` + `fieldOrder*`) e em cada subtabela `FIELD_GROUP` (`FIELD_GROUP_NATIVE_LIST`), incl. `updatedAt`/`updater`. |
| `03-migrate-backfill-storage-location.ts` | `MIGRATION_STORAGE_LOCATION_AT` | Popula `location`/`migration_status` em docs `Storage` (driver lido do Setting, nao de env). **Wrapper `.sh` desativado** — roda pela feature storage-migration. |
| `04-migrate-backfill-relationship-create-records.ts` | `MIGRATION_RELATIONSHIP_CREATE_RECORDS_AT` | Backfilla `allowCreateRelationshipRecords=false` em Fields de relacionamento sem a propriedade (nunca sobrescreve). |
| `05-migrate-extension-slots.ts` | `MIGRATION_EXTENSION_SLOTS_AT` | Renomeia `slot: string \| null` → `slots: string[]` nos docs de `extensions` e remove o campo antigo. |
| `06-migrate-relationship-table-id.ts` | `MIGRATION_RELATIONSHIP_TABLE_ID_AT` | Backfilla `relationship.table._id` em Fields `RELATIONSHIP` (lookup por slug), tornando refs slug-independentes. |
| `07-migrate-row-status-trashed.ts` | `MIGRATION_ROW_STATUS_TRASHED_AT` | Introduz `status`/`draftAt` em rows dinamicas (+ itens `FIELD_GROUP`) e remove o boolean `trashed` — trash derivado de `trashedAt`. Roda no DB **data**. |
| `08-migrate-backfill-row-slugs.ts` | `MIGRATION_ROW_SLUG_BACKFILL_AT` + `MIGRATION_ROW_SLUG_BACKFILL_FALLBACK_AT` | Gera `sharedRowSlug` em rows antigas. Tabelas sem `rowSlugFieldId` recebem fallback (primeiro `TEXT_SHORT` ativo, persistido na table). |
| `09-migrate-table-permissions.ts` | `MIGRATION_TABLE_PERMISSIONS_AT` | Backfill do mapa `permissions` (10 acoes) + `members` a partir de `visibility`/`owner`/`administrators` legados. Acesso raw a `tables`. |
| `10-migrate-field-permissions.ts` | `MIGRATION_FIELD_PERMISSIONS_AT` | Backfill de `permissions.{list,form,detail}` a partir dos booleans `showIn*` (true→PUBLIC, false→NOBODY). Nao toca em `showInFilter`. |
| `11-migrate-menu-visibility.ts` | `MIGRATION_MENU_VISIBILITY_AT` | Define `visibility=PUBLIC` (binding visivel) nos menus sem o campo. |
| `12-migrate-drop-legacy-permission-fields.ts` | `MIGRATION_DROP_LEGACY_PERMISSION_FIELDS_AT` | `$unset` **permanente** dos campos legados (tabela: `visibility`/`collaboration`/`administrators`; campo: `showIn*` — **nao** `showInFilter`). Roda depois de 09/10/11. So mexe em docs ja com `permissions`. |
| `13-migrate-backfill-logger-audit.ts` | `MIGRATION_LOGGER_AUDIT_AT` | Backfill nos logs `ROW` de `creator`/`updater`/`objectCreatedAt`/`objectUpdatedAt`, lidos da propria ROW (dual-connection). `bulkWrite` em lote de 500. |
| `14-migrate-relationship-lift-out-of-groups.ts` | `MIGRATION_RELATIONSHIP_LIFT_OUT_AT` (grava so se nenhum campo falhar) | Promove campos `RELATIONSHIP` aninhados em `FIELD_GROUP` para top-level, unindo (dedup) os ObjectIds dos itens. Roda **antes** de 15. |
| `15-migrate-relationship-embedded-to-links.ts` | `MIGRATION_RELATIONSHIP_EMBEDDED_TO_LINKS_AT` (grava so se nenhum campo divergir) | Converte relacionamento embedded (array de ObjectIds) → pivo: `RelationshipDefinition` + campo-espelho + um `RelationshipLink` por id; `$unset` do array. |
| `16-migrate-backfill-relationship-endpoint-flags.ts` | `MIGRATION_RELATIONSHIP_ENDPOINT_FLAGS_AT` (retido se sobrar campo nao-materializado) | Garante a flag `visible` (top-level + `relationship.visible`) em campos `RELATIONSHIP`. Campos pendentes reprocessam no proximo boot. |
| `17-migrate-relationship-links-to-fk.ts` | `MIGRATION_RELATIONSHIP_LINKS_TO_FK_AT` (grava so sem conflito) | Converte links 1:1/1:N → FK single inline na row; N:N segue no pivo. Roda depois de 15/16. |
| `18-migrate-backfill-relationship-mirror.ts` | `MIGRATION_RELATIONSHIP_MIRROR_AT` | Grava o espelho denormalizado `relationship.mirror` (multiple/visible/label do lado oposto). Roda depois de 16/17. |
| `19-migrate-field-validations.ts` | `MIGRATION_FIELD_VALIDATIONS_AT` | Backfilla `validations: []` em Field docs sem a propriedade. Nao deriva regras do `format` (legado segue validando). |
| `20-migrate-backfill-extension-table-settings.ts` | `MIGRATION_EXTENSION_TABLE_SETTINGS_AT` | Garante `tableSettings: {}` (Mixed) nos Extension docs antigos (default so aplica em escrita nova). |
| `21-migrate-auth-multi-account.ts` | `MIGRATION_AUTH_MULTI_ACCOUNT_AT` | **Marcadora (no-op)**: sessoes multi-conta sao 100% cookies indexados; nada persistido a migrar. So registra a trilha de versao. |
| `22-migrate-row-access-guard.ts` | `MIGRATION_ROW_ACCESS_GUARD_AT` | **Marcadora (no-op)**: row-access avaliado em runtime + backfill em bind-time (`onTableBound`). So registra a trilha de versao. |
| `23-migrate-relationship-repair-unmaterialized.ts` | `MIGRATION_RELATIONSHIP_REPAIR_AT` | Reconstroi links FK-inline a partir do embedded sobrevivente e materializa campos `RELATIONSHIP` que cairam no vao de 14/15. |
| `24-migrate-field-label-to-object.ts` | `MIGRATION_FIELD_LABEL_TO_OBJECT_AT` | Converte `field.label` string → objeto por contexto `{list,filter,form,detail}` (pipeline de agregacao idempotente). |
| `25-migrate-relationship-backfill-form-mode.ts` | `MIGRATION_RELATIONSHIP_FORM_MODE_AT` | Backfilla `formMode='manage'` em campos-espelho N:N. |
| `26-migrate-relationship-cleanup-broken-definitions.ts` | `MIGRATION_RELATIONSHIP_BROKEN_DEFINITIONS_AT` | Quarentena campos-espelho cujas `RelationshipDefinitions` apontam para tabelas inexistentes. |
| `27-migrate-repair-owns-fk.ts` | `MIGRATION_REPAIR_OWNS_FK_AT` | Restaura FKs inline OWNS_FK (1:1/1:N) apagadas pela migration 23 e remove os links criados por ela. |
| `28-migrate-relationship-dedup-consolidate.ts` | `MIGRATION_RELATIONSHIP_DEDUP_AT` | Consolida `RelationshipDefinitions` duplicadas por campo source (e os campos-espelho `-1`…`-N` no target) empilhadas pelas migrations 15/23. |
| `29-migrate-sanitize-field-slugs.ts` | `MIGRATION_FIELD_SLUG_SANITIZE_AT` | Renomeia slugs de campo fora do `FIELD_SLUG_PATTERN` (legado do `slugify` sem `strict`, ex. `processo-sei-n.`), que quebravam o update path do Mongo com `EmptyFieldName` (code 56). Atualiza `fields`, `tables._schema`/`groups`/`fieldOrder*`/`order.field`/`layoutFields`, configs do cascade-dropdown e move os valores das rows para a chave nova via `$setField`. Pula campos nativos. Aceita `--dry-run`. |

> **So migrations de boot.** Remodelagens **manuais/destrutivas** (one-off, sem
> wrapper `.sh`, exigem `--apply --i-have-backup`) vivem separadas em
> `../remodels/` — ver `database/remodels/CLAUDE.md`. Ex.:
> `migrate-fieldgroup-to-relationship.ts`.

## Comandos

**Nao existem** `npm run migrate:*`. As migrations rodam so pelo loop do
`docker-entry-point.sh` no boot Docker. Em dev local (`npm run dev`) nao rodam.
Para rodar uma a mao:

```bash
# via wrapper .sh (resolve dir + usuario non-root; recomendado)
sh scripts/migrations/01-migrate-dual-connection.sh            # skip se ja marcado
sh scripts/migrations/01-migrate-dual-connection.sh --force    # re-executa

# direto no TS (equivalente)
node --import @swc-node/register/esm-register \
  database/migrations/01-migrate-dual-connection.ts -- --force

# drop-source (MANUAL, apenas apos validar em prod + backup)
node --import @swc-node/register/esm-register \
  database/migrations/01-migrate-dual-connection.ts -- --drop-source
```

O `--drop-source` recusa rodar se `MIGRATION_DUAL_CONNECTION_AT` ainda nao foi
setado (copia nunca completou) — protege contra perda de dados. Pre-requisitos:
backup completo (`mongodump`/snapshot), app rodando ha dias escrevendo no DB
data, e validacao de que populate de USER/FILE/RELATIONSHIP funciona.

## Pattern de Migration

Cada migration segue este esqueleto (ver qualquer `NN-migrate-*.ts`):

1. `config({ path: '.env' })` + le `DATABASE_URL`/`DB_DATABASE`/`DB_DATA_DATABASE`
   e `FORCE = process.argv.includes('--force')`.
2. Abre as conexoes com **`mongoose.createConnection(url, { dbName })`** +
   `await conn.asPromise()` — uma para o DB system e, quando mexe em rows
   dinamicas, outra para o DB data. (Nao usa o `MongooseConnect()` do app.)
3. Define um `SettingMarker` local (`new mongoose.Schema({...}, { strict: false,
   collection: 'settings' })`) so com o campo do marker.
4. Checa o marker: se setado e `!FORCE`, `logger.skipped()` e retorna (no-op).
5. Executa a mudanca (idempotente sempre que possivel) usando um `TaskLogger`
   (`shared/task-logger.ts`) para status (`running`/`item`/`done`/`failed`).
6. Grava o marker (`findOneAndUpdate({}, { $set: { MARKER: new Date() } },
   { upsert: true })`) **apenas apos** o sucesso. Migrations da familia
   relationship retem o marker se sobrar campo/definition pendente.
7. `finally { await conn.close() }` fecha todas as conexoes.
8. `migrate().catch((e) => { new TaskLogger(TITLE).failed(e); process.exit(1) })`
   no topo — falha aborta o boot (`set -e`) sem gravar marker.

## Quando criar nova migration

- Renomear/mover collection; backfill de novo campo em docs existentes;
  reestruturar dados que nao dao para fazer em runtime via codigo defensivo.
- Ganha o proximo numero (`28-migrate-...`) + wrapper `.sh` irmao (so cabecalho
  + `. _lib.sh` + `run_migration "<base>"`). Ver `scripts/migrations/CLAUDE.md`.
- Para alteracoes triviais idempotentes que rodam em todo boot, prefira
  `database/seeders/`.
