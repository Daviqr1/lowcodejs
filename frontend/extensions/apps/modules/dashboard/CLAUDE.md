# dashboard (módulo `apps`, frontend)

Entry UI do módulo dashboard (URL `/e/apps/dashboard`, MASTER/ADMINISTRATOR).
Painel administrativo com dados reais. Ativado pelo MASTER em `/extensions`.

| Arquivo                   | Papel                                                     |
| ------------------------- | --------------------------------------------------------- |
| `index.tsx`               | Entry `export default` (PageShell + estados de Suspense)  |
| `use-dashboard-stats.tsx` | TanStack Query → `GET /e/apps/dashboard/stats`            |
| `stat-card.tsx`           | Card reutilizável de estatística                          |
| `chart-tables.tsx`        | Bar chart "tabelas por mês"                               |
| `chart-users.tsx`         | Pie chart "usuários por status"                           |
| `recent-activity.tsx`     | Lista de atividades recentes (`formatDistanceToNow` ptBR) |
| `dashboard-skeleton.tsx`  | Skeleton enquanto a query carrega                         |

Declaração canônica (manifest + endpoint) no backend. Ver
[../CLAUDE.md](../CLAUDE.md) e `backend/extensions/apps/modules/dashboard/`.
