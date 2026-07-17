# Logger — Auditoria do Objeto Referenciado

Resolve os campos de auditoria (`creator`/`updater`/`createdAt`/`updatedAt`) do
**registro referenciado por um log**, lidos direto da própria ROW da tabela
dinâmica. Reaproveitado tanto no runtime (hook de log) quanto na migration
standalone.

## Arquivo

| Arquivo                   | Responsabilidade                                                                 |
| ------------------------- | -------------------------------------------------------------------------------- |
| `resolve-object-audit.ts` | `resolveLoggerObjectAudit(params)` + `tableSlugFromRowUrl(url)` + tipo `LoggerObjectAudit` / `EMPTY_OBJECT_AUDIT` |

## Comportamento

- Só resolve objetos do tipo `E_LOGGER_OBJECT_TYPE.ROW` — as únicas entidades com
  CREATOR + UPDATER. Demais tipos (TABLE, FIELD, USER, MENU, ...) retornam
  `EMPTY_OBJECT_AUDIT` (tudo `null`).
- `tableSlugFromRowUrl` extrai o slug de uma URL `/tables/:slug/rows/...`.
- **Dual-connection**: recebe `systemDb` e `dataDb` (`mongoose.mongo.Db`). Lê a
  row do DB **data** e cai para o DB **system** como fallback (instalações que
  ainda não migraram/droparam o source). Ver `config/database.config.ts`.
- Retorna `LoggerObjectAudit` com `creator`/`updater` como `ObjectId | null` e
  `objectCreatedAt`/`objectUpdatedAt` como `Date | null` (coerção defensiva via
  helpers internos `toObjectIdOrNull`/`toDateOrNull`).
