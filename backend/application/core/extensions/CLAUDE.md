# Extensions (Core) — Loader + Contratos

Infra **do core** para descobrir e validar extensões. Não confundir com
`backend/extensions/CLAUDE.md`, que documenta os **pacotes** de extensão em si.
Aqui vivem o loader de boot, o schema Zod do manifest e o contrato de guard.

## Arquivos

| Arquivo                        | Responsabilidade                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `loader.ts`                    | `loadExtensions(repository)` — varre `extensions/<pkg>/{plugins,modules,tools}/<id>/manifest.json` no boot, valida via Zod e faz upsert na collection |
| `manifest.schema.ts`           | `ManifestSchema` (Zod) + tipo `ManifestInput`. Valida `manifest.json` |
| `row-access-guard.contract.ts` | Contrato `RowAccessGuard` (v3 group-keyed) + tipos de contexto/decisão |

## Loader (`loader.ts`)

- Raiz `extensions/` (via `process.cwd()`); ausente → no-op silencioso.
- Para cada `pkg`, mapeia as pastas `plugins`/`modules`/`tools` →
  `E_EXTENSION_TYPE.PLUGIN/MODULE/TOOL`.
- Lê `manifest.json`, injeta `type` pela pasta e valida com `ManifestSchema`.
  `manifest.id` **deve** casar com o nome da pasta (senão conta como inválido).
- `upsert` grava snapshot do manifest + campos derivados (`slots`, `route`,
  `submenu`, `requires`, `permissions.view`). Pacote `core` nasce ativado
  (`enabledOnInsert`); toggle posterior do MASTER é preservado.
- Ao fim, `markUnavailableExcept(presentKeys)` marca indisponível o que sumiu do
  FS. Retorna `{ loaded, invalid, unavailable }`.

## Manifest (`manifest.schema.ts`)

- `id` casa `^[a-z0-9][a-z0-9-_]*$`; `type ∈ E_EXTENSION_TYPE`; `name`/`version`
  obrigatórios; demais campos nuláveis/opcionais. `.passthrough()` preserva o
  raw para snapshot.
- `placement` (union, opcional): `{ slots: string[] }` (plugin de UI em
  placeholders) **ou** `{ kind: 'row-access-guard' }` (plugin que intercepta
  comportamento do core, sem slot de UI).
- `permissions.view` = array de `E_ROLE` (default `[]`).

## Row Access Guard (`row-access-guard.contract.ts`)

Contrato v3 **group-keyed** implementado por guards e orquestrado pelo
`RowAccessGuardService`. Invariantes (não mudar sem coordenar com o service):

- **Bypass privilegiado global**: usuário cujo fecho de grupos contém MASTER ou
  ADMINISTRATOR pula TODOS os guards (decisão no service via `ctx.isPrivileged`;
  guards podem assumir que nunca é `true` dentro deles).
- **Categoria**: `restrictive` adiciona AND na query e pode emitir `deny`;
  `permissive` adiciona OR (bypass) e pode emitir `allow`.
- **Composição** `canRead`/`canWrite`: `allow > deny > abstain` (default-permitir
  se só houver abstain).
- `adjustListQuery` retorna **fragmento** Mongo (`{}` = nada a contribuir); o
  service compõe via `$and` (restrictive) / `$or` (permissive).
- `sanitizeWritePayload` só é chamado para guards restrictive; permissive devolve
  o payload identity.
- Todos os métodos recebem `GuardEvalContext` (`user`, `userId`, `groupIds`,
  `isPrivileged`) já resolvido pelo caller — guards não resolvem grupos.
