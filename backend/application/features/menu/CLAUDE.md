# Menu

CRUD completo de itens de menu com suporte a hierarquia (parent/children), send-to-trash, delete permanente, remove-from-trash e reordenacao.

## Base Route

`/menu`

## Operacoes

| Operacao | Metodo | Rota | Permissao |
|----------|--------|------|-----------|
| create | POST | `/menu` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` |
| list | GET | `/menu` | Auth only (feed da sidebar; filtragem por visibilidade no use-case) |
| paginated | GET | `/menu/paginated` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` |
| export-csv | GET | `/menu/exports/csv` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` (cap 500.000 linhas) |
| show | GET | `/menu/:_id` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` |
| update | PATCH | `/menu/:_id` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` |
| send-to-trash | PATCH | `/menu/:_id/trash` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` (soft delete) |
| delete | DELETE | `/menu/:_id` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` (exclusao permanente) |
| remove-from-trash | PATCH | `/menu/:_id/restore` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` |
| reorder | PATCH | `/menu/reorder` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` |
| bulk-trash | PATCH | `/menu/bulk-trash` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` |
| bulk-restore | PATCH | `/menu/bulk-restore` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` |
| bulk-delete | DELETE | `/menu/bulk-delete` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` |
| empty-trash | DELETE | `/menu/empty-trash` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` |

## Middlewares Comuns

1. `AuthenticationMiddleware({ optional: false })` — sempre roda primeiro
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)` — em todas as operacoes
   **exceto** `list`

`list` e a unica operacao AUTH-ONLY (sem `PermissionMiddleware`): e o feed de
navegacao da sidebar consumido por qualquer usuario autenticado. A restricao de
acesso acontece no proprio `list.use-case.ts`, que FILTRA os menus retornados
pelo binding de `visibility` de cada item (Grupo|Public|Nobody), de forma
ancestor-aware ("pai oculto esconde a subarvore"), com bypass para MASTER e
ADMINISTRATOR — espelhando o `isMenuVisible` do frontend.

Nao usa TableAccessMiddleware (nao e recurso de tabela).

## Repositorios Utilizados

- `MenuContractRepository` - CRUD de menus
- `TableContractRepository` - validacao de tabela para tipos TABLE/FORM

## Tipos de Menu (E_MENU_ITEM_TYPE)

- TABLE - link para tabela (url auto-gerada: /tables/{slug})
- FORM - link para formulario (url auto-gerada: /tables/{slug}/row/create)
- PAGE - pagina HTML (url auto-gerada: /pages/{slug})
- EXTERNAL - link externo (url obrigatoria)
- SEPARATOR - separador visual
- SECTION - secao/agrupador

## Comportamento Chave

- Hierarquia: menus podem ter parent (referencia a outro menu)
- Slug e gerado automaticamente a partir do nome; se tiver parent, concatena com slug do pai
- Ordenacao: campo `order` (int) determina posicao entre irmaos
- Send-to-trash: marca trashed=true/trashedAt via update, nao permite enviar para lixeira menu com filhos ativos
- Delete: exclusao permanente, somente para menus ja na lixeira
- Remove-from-trash: restaura da lixeira via update (trashed=false, trashedAt=null)
- Protecao contra referencia circular no update
