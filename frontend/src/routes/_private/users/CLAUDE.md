# Gerenciamento de Usuarios

Modulo CRUD de usuarios com listagem paginada, filtros, ordenacao por colunas e
fluxo completo de lixeira (soft delete, restore, hard delete singular/bulk e
empty-trash).

## Rota

- Path: `/users`
- Acesso restrito: roles `MASTER` e `ADMINISTRATOR` (redirecionamento para
  `/tables` caso contrario)
- Titulo SEO: "Usuarios"

## Controle de Acesso

- **MASTER** e **ADMINISTRATOR** podem enviar para lixeira e restaurar.
- Apenas **MASTER** pode hard-deletar usuarios (item "Excluir permanentemente"
  no dropdown e botao correspondente na BulkActionBar).
- Usuario nao pode enviar a si mesmo para a lixeira (backend retorna
  `CANNOT_TRASH_SELF`).
- Usuario MASTER nao pode ser enviado para lixeira por nao-MASTER.
- Usuario que e dono de tabelas nao pode ser hard-deletado (backend retorna
  `OWNER_OF_TABLES`).

## Arquivos

| Arquivo                     | Descricao                                                                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`                 | Route config: beforeLoad (guard de role), validateSearch (paginacao + ordenacao + `trashed`), loader via `userListOptions`                                              |
| `index.lazy.tsx`            | Componente principal: tabela, filtros laterais, paginacao, TrashButton, botao "Novo Usuario" (lista ativa) ou "Esvaziar lixeira" (lista lixeira, MASTER) e dialogs      |
| `-table-users.tsx`          | Tabela DataTable com checkbox de selecao, colunas Nome/E-mail/Grupo/Status e dropdown de acoes (visualizar / editar / enviar para lixeira / restaurar / excluir permanentemente). Na BulkActionBar injeta o dropdown "Alterar status" (Ativar/Desativar em lote) |
| `-table-users-skeleton.tsx` | Skeleton de carregamento da tabela (pendingComponent)                                                                                                                   |

## Subdiretorios

| Diretorio  | Descricao                               |
| ---------- | --------------------------------------- |
| `create/`  | Formulario de criacao de usuario        |
| `$userId/` | Visualizacao e edicao de usuario por ID |

## Hooks e dependencias principais

| Hook/Funcao                                                       | Origem                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| `userListOptions`                                                 | `@/hooks/tanstack-query/_query-options`               |
| `useSuspenseQuery`                                                | `@tanstack/react-query`                               |
| `useUserSendToTrash` / `useUserRemoveFromTrash` / `useUserDelete` | `@/hooks/tanstack-query/`                             |
| `useUserBulkTrash` / `useUserBulkRestore` / `useUserBulkDelete`   | `@/hooks/tanstack-query/`                             |
| `useUserBulkUpdate` (status em lote)                              | `@/hooks/tanstack-query/use-user-bulk-update`         |
| `useUserEmptyTrash`                                               | `@/hooks/tanstack-query/`                             |
| `useDataTable`                                                    | `@/hooks/use-data-table`                              |
| `useSidebar`                                                      | `@/components/ui/sidebar`                             |
| `useAuthStore`                                                    | `@/stores/authentication`                             |
| `FilterSidebar` / `FilterTrigger`                                 | `@/components/common/filters`                         |
| `Pagination`                                                      | `@/components/common/pagination`                      |
| `BulkActionBar`                                                   | `@/components/common/bulk-action-bar`                 |
| `PermanentDeleteConfirmDialog`                                    | `@/components/common/permanent-delete-confirm-dialog` |
| `TrashButton`                                                     | `@/components/common/trash-button`                    |

## Search params (validacao Zod)

| Param                                                                          | Tipo                                 |
| ------------------------------------------------------------------------------ | ------------------------------------ |
| `search`                                                                       | string (opcional)                    |
| `page`                                                                         | number (default 1)                   |
| `perPage`                                                                      | number (default 50)                  |
| `trashed`                                                                      | boolean preprocess (`?trashed=true`) |
| `order-name`, `order-email`, `order-group`, `order-status`, `order-created-at` | "asc" ou "desc" (opcional)           |
