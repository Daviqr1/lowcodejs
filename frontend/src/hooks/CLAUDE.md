# Hooks

Custom React hooks divididos em hooks de dominio (raiz) e hooks de API
(`tanstack-query/`).

## Estrutura

Hooks na raiz encapsulam logica de UI, estado local e composicao de outros
hooks. Hooks em `tanstack-query/` encapsulam chamadas HTTP via TanStack Query.

## Hooks de dominio (raiz)

| Hook                         | Arquivo                            | Descricao                                                                                                                                                                                                                                                                                              |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useDataTable`               | `use-data-table.ts`                | Configura `useReactTable` com estado persistido (visibilidade, ordem, sizing, selecao). Modo manual para sorting/filtering/pagination.                                                                                                                                                                 |
| `usePersistedTableState`     | `use-persisted-table-state.ts`     | Persiste columnVisibility, columnOrder e columnSizing no localStorage com debounce de 300ms. Prefixo `dt:`.                                                                                                                                                                                            |
| `useFieldColumns`            | `use-field-columns.tsx`            | Gera `ColumnDef[]` dinamicamente a partir de `IField[]`, mapeando cada `field.type` para o cell component correto via switch.                                                                                                                                                                          |
| `useTableFieldManagement`    | `use-table-field-management.ts`    | Acoes de gerenciamento de campos de tabela: toggle visibilidade, alterar largura, reordenar, excluir e editar. Usa `useMutation` com cache manual.                                                                                                                                                     |
| `useGroupFieldManagement`    | `use-group-field-management.ts`    | Mesmo que `useTableFieldManagement`, mas para campos dentro de grupos de campos (field groups).                                                                                                                                                                                                        |
| `useTablePermission`         | `use-table-permission.ts`          | Verifica permissoes de tabela baseado em papel (MASTER/ADMIN), ownership/perfil de membro (OWNER/ADMIN) e bindings de `table.permissions[action]` contra o fecho de grupos do usuario (PUBLIC libera, GROUP exige o grupo, NOBODY/ausente nega). Exporta tambem `usePermission` para acoes sem tabela. |
| `useTableKeyboardNavigation` | `use-table-keyboard-navigation.ts` | Navegacao por teclado (arrow keys, Enter, Space, Home/End/Escape) em tabelas com role grid.                                                                                                                                                                                                            |
| `useChatSocket`              | `use-chat-socket.ts`               | Conexao Socket.IO para chat com IA. Gerencia mensagens, tool activities, status e invalidacao de queries apos tool results que modificam dados.                                                                                                                                                        |
| `useChatSidebar`             | `use-chat-sidebar.ts`              | Controle de estado aberto/fechado do sidebar de chat, persistido no localStorage.                                                                                                                                                                                                                      |
| `useFilterSidebar`           | `use-filter-sidebar.ts`            | Controle de estado aberto/fechado do sidebar de filtros, persistido no localStorage.                                                                                                                                                                                                                   |
| `useToolbarPortal`           | `use-toolbar-portal.ts`            | Referencia de portal para renderizar controles de toolbar (DataTableColumnToggle) no header via createPortal.                                                                                                                                                                                          |
| `useDebouncedValue`          | `use-debounced-value.tsx`          | Debounce generico de valor com delay configuravel via `setTimeout`.                                                                                                                                                                                                                                    |
| `useIsMobile`                | `use-mobile.ts`                    | Detecta viewport mobile (< 768px) via `matchMedia`.                                                                                                                                                                                                                                                    |
| `useAutoSave`                | `use-auto-save.ts`                 | Auto-save generico com debounce: dispara o callback de salvamento apos periodo de inatividade do valor observado.                                                                                                                                                                                      |
| `useFieldVisibility`         | `use-field-visibility.ts`          | Decide se um campo e visivel ao usuario num contexto (`list`/`form`/`detail`), respeitando o binding por grupo do campo (MASTER/ADMINISTRATOR veem liberados a grupos; NOBODY oculta).                                                                                                                 |
| `useTheme`                   | `use-theme.ts`                     | Estado do tema claro/escuro com `toggleTheme` e persistencia.                                                                                                                                                                                                                                          |
| `useNotificationsSocket`     | `use-notifications-socket.ts`      | Conexao Socket.IO de notificacoes em tempo real; respeita `visualEnabled` do perfil e invalida contadores/listas.                                                                                                                                                                                      |
| `useCsvImportSocket`         | `use-csv-import-socket.ts`         | Conexao Socket.IO que acompanha o progresso de importacao de registros via CSV.                                                                                                                                                                                                                        |
| `useStorageMigrationSocket`  | `use-storage-migration-socket.ts`  | Conexao Socket.IO (namespace `/storage-migration`) que acompanha o progresso da migracao de storage.                                                                                                                                                                                                   |
| `useUserMentionSearch`       | `use-user-mention-search.tsx`      | Busca paginada de usuarios para mencao `@` no rich-editor/forum.                                                                                                                                                                                                                                       |

## Subdiretorios

| Diretorio         | Descricao                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `tanstack-query/` | Hooks de API usando TanStack Query (queries e mutations). Ver `tanstack-query/CLAUDE.md`. |

## Convencoes

- **Nomenclatura**: `use-{dominio}-{acao}.ts` ou `.tsx` quando ha JSX
- **Retorno tipado**: todos os hooks declaram tipo de retorno explicito
  (interface ou inline)
- **Sem ternarios**: preferir if/else ou funcoes separadas para logica
  condicional
- **Composicao**: hooks de dominio compoe hooks menores (ex: `useDataTable` usa
  `usePersistedTableState`)
- **Cache manual**: hooks de field management usam `queryClient.setQueryData`
  para atualizar cache sem refetch
- **Estado local**: hooks de UI usam `useState` + `useMemo`/`useCallback` para
  performance
