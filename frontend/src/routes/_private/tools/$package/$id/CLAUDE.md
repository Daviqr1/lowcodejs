# tools/$package/$id — Rota dinâmica de ferramentas de extensão

Monta o entry React de uma **ferramenta** de extensão (`type=TOOL`) pela URL
`/tools/<pkg>/<id>` (submenu Ferramentas na sidebar). Segmentos dinâmicos
`$package`/`$id` resolvem qual extensão carregar.

| Arquivo          | Papel                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `index.tsx`      | Route config (`createFileRoute`) — head/guard                                                                   |
| `index.lazy.tsx` | Lazy-importa `frontend/extensions/<pkg>/tools/<id>/index.tsx` via `loadExtensionEntry` e renderiza sob Suspense |

Ver `frontend/extensions/CLAUDE.md` e `backend/extensions/CLAUDE.md`.
