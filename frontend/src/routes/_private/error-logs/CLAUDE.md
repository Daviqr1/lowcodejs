# Error Logs — Histórico de Erros

Visualizador dos erros HTTP registrados pelo backend. Lista paginada com
filtros, cartões de estatística, exportação CSV, diálogo de inspeção do JSON
bruto e toggle para marcar cada entrada como resolvida/pendente. Rota
`/error-logs`. Restrito a MASTER.

## Rota

| Rota          | Descrição                                                |
| ------------- | -------------------------------------------------------- |
| `/error-logs` | Listagem paginada dos erros HTTP com filtros e resolução |

## Arquivos

| Arquivo             | Tipo               | Descrição                                                                                                                    |
| ------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`         | Loader             | Route config: `beforeLoad` (guard MASTER), `validateSearch` (page, perPage, search, status, resolved, order-\*) + head       |
| `index.lazy.tsx`    | Componente         | Layout `PageShell` com Header, FilterSidebar, StatCards, TableErrors, Pagination, JsonDialog e toggle de visão resolvidos    |
| `-table-errors.tsx` | Componente privado | DataTable dos erros (status, rota, método, mensagem, data, ações); resolve/reabre via `useErrorLogResolve` (update otimista) |
| `-status-badge.tsx` | Componente privado | `StatusBadge` — badge colorido por faixa de status HTTP (via `statusClassName`)                                              |
| `-stat-card.tsx`    | Componente privado | Cartão de métrica (label + valor + ícone)                                                                                    |
| `-json-dialog.tsx`  | Componente privado | Modal com metadados + JSON bruto da entrada de erro                                                                          |
| `-constants.ts`     | Constantes/tipos   | `ROUTE_ID`, `STATUS_OPTIONS`, `statusClassName` e tipos de filtro                                                            |
| `-csv.ts`           | Utilitário         | `entriesToCsv()` serializa e `downloadCsv()` dispara download no navegador                                                   |

## Fluxo

1. Loader valida search params e faz o guard de role; o componente consome via
   `useErrorLogReadPaginated(queryParams)`
2. `?resolved=true` alterna a visão entre erros pendentes e resolvidos
3. StatCards resumem métricas da página/`meta`
4. Cada linha permite marcar como resolvida/pendente (`useErrorLogResolve`) e
   abrir o `JsonDialog` com o payload bruto
5. Exportação CSV via `entriesToCsv` + `downloadCsv`

## Convenções

- Acesso restrito a MASTER (guard no `beforeLoad` + RBAC no backend)
- Ordenação por coluna via search params `order-*` (`DataTableColumnHeader`)
- Estado da tabela persistido com `useDataTable`
- UI em PT-BR
