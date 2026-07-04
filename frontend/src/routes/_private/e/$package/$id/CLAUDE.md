# e/$package/$id — Rota dinâmica de módulos de extensão

Monta o entry React de um **módulo** de extensão (`type=MODULE`) pela URL
canônica `/e/<pkg>/<id>`. Segmentos dinâmicos `$package`/`$id` resolvem qual
extensão carregar.

| Arquivo          | Papel                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| `index.tsx`      | Route config (`createFileRoute`) — head/guard                         |
| `index.lazy.tsx` | Lazy-importa `frontend/extensions/<pkg>/modules/<id>/index.tsx` via `loadExtensionEntry` (`import.meta.glob`) e renderiza sob Suspense |

Ver `frontend/extensions/CLAUDE.md` (descoberta de entries) e
`backend/extensions/CLAUDE.md` (registro/ativação no DB).
