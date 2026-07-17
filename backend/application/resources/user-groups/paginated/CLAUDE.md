# Paginated User Groups

Lista grupos de usuarios com paginacao, busca e ordenacao.

## Endpoint
`GET /user-group/paginated` | Auth: Yes | Permission: MANAGE_USER_GROUPS

## Fluxo
1. Middleware: `AuthenticationMiddleware({ optional: false })` seguido de `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS)`
2. Validator: `UserGroupPaginatedQueryValidator` - campos: page (number, min 1, default 1), perPage (number, min 1, max 100, default 50), search (string, trim, optional), order-name (enum asc/desc, optional), order-description (enum asc/desc, optional), order-created-at (enum asc/desc, optional)
3. UseCase: `UserGroupPaginatedUseCase`
   - Monta objeto `sort` a partir dos parametros order-*
   - Busca grupos paginados via `findMany({ page, perPage, search, user, sort })`
   - Conta total via `count({ search, user })`
   - Calcula metadados de paginacao (total, perPage, page, lastPage, firstPage)
   - Retorna `{ meta, data }`
4. Repository: `UserGroupContractRepository` - `findMany()`, `count()`

## Regras de Negocio
- Envia `user._id` e `user.role` do token JWT para o repositorio (filtragem por role)
- Ordenacao suportada por: name, description, createdAt
- firstPage e 0 quando nao ha registros, 1 caso contrario

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Token JWT ausente ou invalido |
| 500 | LIST_USER_GROUP_PAGINATED_ERROR | Erro interno (banco, etc) |

## Testes
- Unit: `paginated.use-case.spec.ts`
- E2E: `paginated.controller.spec.ts`
