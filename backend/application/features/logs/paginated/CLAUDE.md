# Paginated Users

Lista usuarios com paginacao, busca e ordenacao.

## Endpoint
`GET /users/paginated` | Auth: Yes | Permission: -

## Fluxo
1. Middleware: `AuthenticationMiddleware({ optional: false })`
2. Validator: `UserPaginatedQueryValidator` - campos: page (number, min 1, default 1), perPage (number, min 1, max 100, default 50), search (string, trim, optional), order-name (enum asc/desc, optional), order-email (enum asc/desc, optional), order-group (enum asc/desc, optional), order-status (enum asc/desc, optional), order-created-at (enum asc/desc, optional)
3. UseCase: `UserPaginatedUseCase`
   - Monta objeto `sort` a partir dos parametros order-*
   - Busca usuarios paginados via `findMany({ ...payload, sort })`
   - Conta total de registros via `count(payload)`
   - Calcula metadados de paginacao (total, perPage, page, lastPage, firstPage)
   - Retorna `{ meta, data }`
4. Repository: `UserContractRepository` - `findMany()`, `count()`

## Regras de Negocio
- Envia `user._id` e `user.role` do token JWT para o repositorio (filtragem por role)
- Ordenacao suportada por: name, email, group.name, status, createdAt
- firstPage e 0 quando nao ha registros, 1 caso contrario

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Token JWT ausente ou invalido |
| 500 | LIST_USER_PAGINATED_ERROR | Erro interno (banco, etc) |

## Testes
- Unit: `paginated.use-case.spec.ts`
- E2E: `paginated.controller.spec.ts`
