# Gerenciamento de Grupos de Usuarios

CRUD de grupos de usuarios com listagem paginada, filtros, navegacao para
criacao/edicao e fluxo completo de lixeira (soft delete, restore, hard delete
singular/bulk e empty-trash).

## Rota

`/groups` -- lista paginada de grupos com filtro por nome, ordenacao por nome,
descricao e data de criacao, alem de toggle para visualizar a lixeira via search
param `?trashed=true`.

## Controle de Acesso

- **MASTER** e **ADMINISTRATOR** acessam a rota (`beforeLoad` redireciona para
  `/tables` caso contrario).
- Apenas **MASTER** pode hard-deletar grupos (botao "Excluir permanentemente" na
  BulkActionBar e item correspondente no dropdown de acoes).
- Grupos do sistema (`MASTER`, `ADMINISTRATOR`, `MANAGER`, `REGISTERED`) nao
  podem ser enviados para lixeira nem hard-deletados (gate na UI + backend
  retorna `SYSTEM_GROUP_PROTECTED`).
- Grupos com usuarios atribuidos nao podem ser hard-deletados (backend retorna
  `GROUP_HAS_USERS`).

## Arquivos

| Arquivo                      | Descricao                                                                                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`                  | Route config: validacao de search params (page, perPage, search, trashed, order-\*), beforeLoad com guard de role, loader com `groupListOptions`                                                                  |
| `index.lazy.tsx`             | Componente principal: tabela de grupos, filtro lateral, paginacao, TrashButton, botao "Novo Grupo" (lista ativa) ou "Esvaziar lixeira" (lista lixeira, MASTER) e dialogs                                          |
| `-table-groups.tsx`          | Tabela DataTable com checkbox de selecao, colunas nome/descricao, dropdown de acoes (visualizar / editar / enviar para lixeira / restaurar / excluir permanentemente). "Editar" abre `/groups/$groupId?mode=edit` |
| `-table-groups-skeleton.tsx` | Skeleton de loading para a tabela, usado como `pendingComponent`                                                                                                                                                  |

## Subdiretorios

| Diretorio   | Descricao                                |
| ----------- | ---------------------------------------- |
| `create/`   | Formulario de criacao de novo grupo      |
| `$groupId/` | Visualizacao e edicao de grupo existente |

## Hooks Utilizados

| Hook                                                                 | Origem                                  | Uso                                                                    |
| -------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| `useSuspenseQuery` + `groupListOptions`                              | `@/hooks/tanstack-query/_query-options` | Busca lista paginada (respeita `trashed` no search param)              |
| `useGroupSendToTrash` / `useGroupRemoveFromTrash` / `useGroupDelete` | `@/hooks/tanstack-query/`               | Operacoes singulares de lixeira                                        |
| `useGroupBulkTrash` / `useGroupBulkRestore` / `useGroupBulkDelete`   | `@/hooks/tanstack-query/`               | Operacoes em lote a partir da selecao da tabela                        |
| `useGroupEmptyTrash`                                                 | `@/hooks/tanstack-query/`               | Esvaziar lixeira (somente MASTER)                                      |
| `useDataTable`                                                       | `@/hooks/use-data-table`                | Estado da tabela com `enableRowSelection` e `persistKey: admin:groups` |
| `useAuthStore`                                                       | `@/stores/authentication`               | Recupera role para gates `isMaster` / `canTrash`                       |

## Componentes Compartilhados

| Componente                     | Uso                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `BulkActionBar`                | Barra inferior sticky com acoes em lote (renderizada quando `selectedCount > 0`)         |
| `PermanentDeleteConfirmDialog` | Confirmacao destrutiva com captcha matematico para hard delete singular/bulk/empty-trash |
| `TrashButton`                  | Toggle entre lista ativa e lista da lixeira via search param                             |

## Search Params

| Param               | Tipo                 | Default | Observacao                                      |
| ------------------- | -------------------- | ------- | ----------------------------------------------- |
| `page`              | number               | 1       |                                                 |
| `perPage`           | number               | 50      |                                                 |
| `search`            | string               | -       |                                                 |
| `trashed`           | boolean (preprocess) | -       | `?trashed=true` ativa a visualizacao da lixeira |
| `order-name`        | asc/desc             | -       |                                                 |
| `order-description` | asc/desc             | -       |                                                 |
| `order-created-at`  | asc/desc             | -       |                                                 |
