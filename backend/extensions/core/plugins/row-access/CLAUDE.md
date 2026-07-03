# Row Access (plugin `core:row-access`)

Plugin do tipo **row-access-guard** (`placement: { kind: 'row-access-guard' }`):
restringe o acesso a rows por um campo de **visibilidade** mapeado a grupos, com
bypass de criador e janela temporal opcional. Registrado no
`RowAccessGuardService` do core (ver `application/services/row-access-guard/` e
`application/core/extensions/row-access-guard.contract.ts`).

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `guard.ts` | `RowAccessControlGuard` (`@Service`) — implementa o contrato `RowAccessGuard` |
| `settings-schema.ts` | Zod schema + tipo `RowAccessSettings` + `DEFAULT_ROW_ACCESS_SETTINGS` |
| `guard.service.spec.ts` | Unit tests dos métodos puros |
| `manifest.json` | Manifest do plugin (`kind: row-access-guard`) |

## Contrato (`RowAccessGuard`)

- `pluginKey = 'core:row-access'`; `category = 'restrictive'`;
  `supportsScopeAll = false`.
- `adjustListQuery` — compõe o filtro Mongo: `$in` dos valores de visibilidade
  liberados aos grupos do usuário **+** escape do criador (creatorBypass) via
  `$or`. Visitante sem grupo → bloqueia (`__BLOCKED__`) para não vazar a lista.
- `canRead`/`canWrite`/`sanitizeWritePayload` — decisão por row.
- `onTableBound` — backfill do campo de visibilidade em todas as rows ao vincular.

## Settings (`RowAccessSettings`)

- `visibility`: `{ enabled, fieldSlug, values[], groupMatrix (valor → grupos),
  defaultValue }`.
- `creatorBypass`: `{ enabled }` — o criador sempre vê a própria row.
- `dateWindow`: `{ mode: 'off' | 'createdAt-sliding' | ..., slidingDays? }` —
  restringe por janela temporal.

Configurado por tabela via `/extensions/:_id/table-scope` +
`bulk-table-settings` (MANAGE_PLUGINS).
