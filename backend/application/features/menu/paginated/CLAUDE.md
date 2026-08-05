# Paginated Menu

Lista menus com paginacao, busca e ordenacao.

## Endpoint
`GET /menu/paginated` | Auth: Yes | Permission: `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)`

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Validator: MenuPaginatedQueryValidator - campos: page (number, default 1, min 1), perPage (number, default 50, min 1, max 100), search (string, optional), trashed (enum 'true'/'false' transformado em boolean, optional), order-name (enum asc/desc, optional), order-slug (enum asc/desc, optional), order-type (enum asc/desc, optional), order-created-at (enum asc/desc, optional), order-owner (enum asc/desc, optional)
3. UseCase:
   - Monta objeto sort a partir dos parametros order-*
   - Busca menus paginados via menuRepository.findMany
   - Conta total via menuRepository.count
   - Calcula meta de paginacao (total, perPage, page, lastPage, firstPage)
   - Retorna { meta, data }
4. Repository: MenuContractRepository (findMany, count)

## Regras de Negocio
- Filtro trashed permite ver menus na lixeira
- Search busca por texto
- Multiplas colunas de ordenacao podem ser combinadas
- Retorna formato Paginated<IMenu> com meta

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 500 | LIST_MENU_PAGINATED_ERROR | Erro interno |

## Testes
- Unit: `paginated.use-case.spec.ts`
- E2E: `paginated.controller.spec.ts`
