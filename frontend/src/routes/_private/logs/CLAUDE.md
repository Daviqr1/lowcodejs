# Logs — Histórico de Atividade

Visualizador do histórico de ações do sistema (logger). Lista paginada de
registros com filtros, ordenação, cartões de estatística, exportação CSV e
diálogo de inspeção do JSON bruto de cada entrada. Rota `/logs`.

## Rota

| Rota    | Descrição                                           |
| ------- | --------------------------------------------------- |
| `/logs` | Listagem paginada do histórico de ações com filtros |

## Arquivos

| Arquivo              | Tipo               | Descrição                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`          | Loader             | Valida search params (`page`, `perPage`, `search`, `actions`, `objects`, `date-from`, `date-to`, `order-*`); skeleton de 6 col                                                                                                                                                                                                    |
| `index.lazy.tsx`     | Componente         | Layout `PageShell` com Header, FilterSidebar, 4 StatCards, TableHistory, Pagination e JsonDialog                                                                                                                                                                                                                                  |
| `-table-history.tsx` | Componente privado | DataTable: data, usuário, ação, tipo de objeto, ID do objeto, criado por, criado em, modificado por, modificado em, URL, ações (menu). As 4 colunas de auditoria (criado/modificado por/em) vêm do registro referenciado (`creator`/`updater`/`objectCreatedAt`/`objectUpdatedAt`), preenchidas no log; null vira "Não informado" |
| `-action-badge.tsx`  | Componente privado | Badge colorido com ícone por ação (CREATE/UPDATE/VIEW/DELETE) via `ACTION_META`                                                                                                                                                                                                                                                   |
| `-stat-card.tsx`     | Componente privado | Cartão de métrica (label + valor + ícone com cor de acento configurável)                                                                                                                                                                                                                                                          |
| `-json-dialog.tsx`   | Componente privado | Modal com metadados da entrada + conteúdo JSON bruto formatado                                                                                                                                                                                                                                                                    |
| `-constants.ts`      | Constantes/tipos   | `ROUTE_ID`, `ActionType`, `ObjectType`, `ACTION_OPTIONS`, `OBJECT_OPTIONS`, `ACTION_META`, `FiltersState`, `parseCsvList`                                                                                                                                                                                                         |
| `-csv.ts`            | Utilitário         | `entriesToCsv()` serializa entradas e `downloadCsv()` dispara download no navegador                                                                                                                                                                                                                                               |

## Fluxo

1. Loader valida e normaliza search params; o componente consome via
   `useLoggerReadPaginated(queryParams)`
2. FilterSidebar oferece 3 filtros: ações (multi-select), objetos (multi-select)
   e intervalo de datas
3. Cartões calculam métricas (total, hoje, updates, creates) a partir da página
   atual e do `meta`
4. Clique numa linha (ou no menu de ações) abre `JsonDialog` com o conteúdo
   bruto; a URL de destino navega via `resolveLoggerNavigateTarget`

## Convenções

- Usuários sem papel MASTER/ADMINISTRATOR veem apenas as próprias ações (com
  aviso na UI); RBAC reforçado pelo backend
- Ordenação por coluna via search params `order-*` (`DataTableColumnHeader`)
- Estado da tabela persistido com
  `useDataTable({ persistKey: 'admin:history' })`; coluna `actions` pinada à
  direita
