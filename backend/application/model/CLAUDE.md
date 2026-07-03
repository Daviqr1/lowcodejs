# Models

Mongoose schemas. Todos usam timestamps e soft delete (`trashed` + `trashedAt`).
Os 16 models vivem na **conexao system** (database `DB_DATABASE`, default
`lowcodejs`). Collections de dados de tabelas dinamicas (criadas pelo usuario
no low-code) vivem na **conexao data** (`DB_DATA_DATABASE`, default
`lowcodejs_data`) e sao registradas em runtime via `buildTable(table, getDataConnection())`,
NAO neste diretorio.

## Entidades

| Model | Collection | Campos Principais | Relacoes |
|-------|-----------|-------------------|----------|
| `user.model.ts` | users | name, email, password, status, groups | group -> UserGroup (legado), groups -> [UserGroup] |
| `user-group.model.ts` | user-groups | name, slug, description, encompasses | permissions -> [Permission], encompasses -> [UserGroup] (fecho transitivo) |
| `permission.model.ts` | permissions | name, slug, description | - |
| `table.model.ts` | tables | name, slug, _schema, type, style, permissions (mapa acao→binding), members, methods, groups, order, layoutFields | fields -> [Field], logo -> Storage, owner -> User, members[].user -> User |
| `field.model.ts` | fields | name, slug, type, required, multiple, format, permissions ({list,form,detail}), showInFilter, widthIn*, locked, native, defaultValue | relationship.table -> Table, relationship.field -> Field, group -> FieldGroup |
| `storage.model.ts` | storage | filename, mimetype, size, originalName | Virtual: url (SERVER_URL/storage/filename) |
| `validation-token.model.ts` | validation-tokens | code, status | user -> User |
| `menu.model.ts` | menus | name, slug, type, url, html, order, visibility (binding {kind,group}; null = legado/visivel) | table -> Table (nullable), parent -> Menu (self-ref), owner -> User |
| `reaction.model.ts` | reactions | type (LIKE/UNLIKE) | user -> User |
| `evaluation.model.ts` | evaluations | value (number) | user -> User |
| `setting.model.ts` | settings | Singleton com configuracoes globais: SYSTEM_NAME, LOCALE, STORAGE_DRIVER, EMAIL_PROVIDER_*, OPENAI_API_KEY, AI_LLM_PROVIDER/LLM_*, SETUP_COMPLETED, MIGRATION_*_AT, etc. | MODEL_CLONE_TABLES -> [Table] |
| `notification.model.ts` | notifications | userId, type, title, body, action ({type,href,label}), source ({pkg,tableSlug,rowId,anchorId}), read, readAt | userId -> User, actorUserId -> User |
| `logger.model.ts` | logs | url, action, object, object_id, content; auditoria do registro referenciado (creator/updater/objectCreatedAt/objectUpdatedAt, preenchida por hook/backfill) | user/creator/updater -> User |
| `extension.model.ts` | extensions | pkg, type, extensionId, name, version, enabled, available, tableScope ({mode,tableIds}), tableSettings, manifestSnapshot, permissions.view | indice unique (pkg,type,extensionId) |
| `relationship-definition.model.ts` | relationship-definitions | name, source/target (Endpoint {table,field,visible,label}), onDelete (CASCADE/SET_NULL/RESTRICT) | source/target.table -> Table, source/target.field -> Field |
| `relationship-link.model.ts` | relationship-links | relationshipId, sourceId, targetId, order, metadata | relationshipId -> RelationshipDefinition; unique (relationshipId,sourceId,targetId) |

## Campos Base (todas as entidades)

```typescript
{
  _id: ObjectId (auto),
  createdAt: Date (auto),
  updatedAt: Date (auto),
  trashed: Boolean (default: false),
  trashedAt: Date (default: null)
}
```

## Campos Nativos de Tabelas Dinamicas

Toda tabela criada no low-code recebe automaticamente 7 campos nativos
(`FIELD_NATIVE_LIST` em `core/entity.core.ts`):
- `_id` (IDENTIFIER), `creator` (CREATOR), `createdAt` (CREATED_AT),
  `updatedAt` (UPDATED_AT), `updater` (UPDATER), `status` (STATUS),
  `trashedAt` (TRASHED_AT)

## Modelo de Permissoes (campos por entidade)

O RBAC foi reescrito. Os campos abaixo materializam o novo modelo; ver
`services/permission/` e `middlewares/` para o enforcement.

- **user**: `groups[]` (varios grupos). `group` (singular) **mantido** como
  legado/fallback.
- **user-group**: `encompasses[]` — grupos englobados (fecho transitivo).
- **table**: `permissions` (mapa das 10 acoes → binding `{ kind, group }` com
  `kind ∈ PUBLIC|NOBODY|GROUP`), `members[]` (`{ user, profile }`,
  `profile ∈ owner|admin|editor|contributor|viewer`), `owner`.
- **field**: `permissions: { list, form, detail }` — binding por contexto.
  Ausencia de binding num contexto = campo visivel. `field.showInFilter` e um
  campo separado (nao e permissao): controla apenas a sidebar de filtros.
- **menu**: `visibility` — binding por opcao de menu.

### Modelo legado removido

Os campos `table.visibility/collaboration/administrators[]` e
`field.showInList/showInForm/showInDetail` foram **removidos** do schema, dos
tipos e dos enums (incluindo `E_TABLE_VISIBILITY`/`E_TABLE_COLLABORATION`). Nao
ha fallback: o enforcement le somente o modelo novo. Tabelas novas ja nascem com
`permissions` preenchido (preset `RESTRICTED`). As migrations 09/10/11 fazem o
backfill e a migration 12 (`drop-legacy-permission-fields`) faz o `$unset`
permanente dos campos legados — todas rodam automaticamente no boot.
`field.showInFilter` e preservado.
