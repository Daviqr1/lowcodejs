# Gestao de Menus

Modulo CRUD de menus do sistema com listagem paginada, filtros, ordenacao por
colunas e fluxo completo de lixeira (soft delete, restore, hard delete singular,
bulk-trash, bulk-restore, bulk-delete e empty-trash). Restrito a roles MASTER e
ADMINISTRATOR.

## Rota

`/menus` -- lista paginada com toggle de lixeira, busca por nome e ordenacao por
colunas (nome, slug, tipo, criado por, criado em).

## Controle de Acesso

- **MASTER** e **ADMINISTRATOR** podem enviar para lixeira e restaurar.
- Apenas **MASTER** pode hard-deletar menus (item "Excluir permanentemente" no
  dropdown, botao na BulkActionBar e botao "Esvaziar lixeira").
- Bulk-trash em menu pai aplica cascata recursiva nos descendentes (resolvido no
  backend via `findDescendantIds`).
- Hard delete singular ou em lote requer que o menu esteja na lixeira (backend
  retorna `NOT_TRASHED`).

## Arquivos

| Arquivo                     | Descricao                                                                                                                                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`                 | Route config: validacao de search params (page, perPage, search, trashed, order-\*), beforeLoad com guard de role, loader com `menuListOptions`                                                                                                 |
| `index.lazy.tsx`            | Componente principal: header com TrashButton/FilterTrigger, botao "Novo Menu" (lista ativa) ou "Esvaziar lixeira" (lixeira, MASTER), FilterSidebar, TableMenus, Pagination e dialogs                                                            |
| `-table-menus.tsx`          | Tabela DataTable com checkbox de selecao, colunas (nome, slug, tipo, criado por, criado em, acoes), dropdown com visualizar / editar (`/menus/$menuId?mode=edit`) / pagina inicial / lixeira, BulkActionBar, dialogs de hard delete com captcha |
| `-table-menus-skeleton.tsx` | Skeleton de carregamento da tabela                                                                                                                                                                                                              |
| `-separator-info.tsx`       | Banner informativo exibido quando o tipo do menu e SEPARATOR                                                                                                                                                                                    |

> **Nota**: Soft trash/restore singular continuam usando `ActionDialog` via
> refs. O hard delete singular foi migrado para `PermanentDeleteConfirmDialog`
> (com captcha matematico).

## Subdiretorios

| Diretorio  | Descricao                               |
| ---------- | --------------------------------------- |
| `create/`  | Formulario de criacao de novo menu      |
| `$menuId/` | Visualizacao e edicao de menu existente |

## Hooks e dependencias principais

- `menuListOptions` -- query options para listagem (de
  `@/hooks/tanstack-query/_query-options`)
- `useSuspenseQuery` -- carregamento de dados com Suspense
- `useDataTable` -- estado da tabela com `enableRowSelection: canTrash` e
  persistencia (`persistKey: 'admin:menus'`)
- `useMenuBulkTrash`, `useMenuBulkRestore`, `useMenuBulkDelete`,
  `useMenuEmptyTrash` -- mutacoes em lote e hard delete singular (reusa
  `useMenuBulkDelete` com `{ ids: [_id] }`)
- `useSidebar` -- controle do sidebar ao navegar
- `useAuthStore` -- recupera role para gates `isMaster` / `canTrash`
- `queryKeys.menus.all` -- chave invalidada apos mutacoes

## Componentes Compartilhados

| Componente                     | Uso                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `BulkActionBar`                | Barra inferior sticky com acoes em lote conforme `isTrashView` e `canDelete` |
| `PermanentDeleteConfirmDialog` | Captcha matematico para hard delete singular/bulk/empty-trash                |
| `TrashButton`                  | Toggle entre lista ativa e lixeira via search param                          |
| `ActionDialog` (refs)          | Mantido apenas para soft trash/restore singular (codigo legado preservado)   |

## Tipos de menu

Mapeados em `E_MENU_ITEM_TYPE`: PAGE, TABLE, FORM, EXTERNAL, SEPARATOR.
