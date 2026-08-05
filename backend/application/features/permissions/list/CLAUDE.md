# List Permissions

Lista todas as permissoes disponiveis no sistema.

## Endpoint
`GET /permissions` | Auth: Yes | Permission: -

## Fluxo
1. Middleware: `AuthenticationMiddleware({ optional: false })`
2. Validator: nenhum (sem parametros de entrada)
3. UseCase: `PermissionListUseCase`
   - Busca todas as permissoes via `findMany()`
   - Retorna array de permissoes
4. Repository: `PermissionContractRepository` - `findMany()`

## Regras de Negocio
- Retorna array direto (nao paginado)
- Sem filtros ou parametros de busca
- Permissoes sao criadas via seeders, nao via API

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Token JWT ausente ou invalido |
| 500 | LIST_PERMISSION_ERROR | Erro interno (banco, etc) |

## Testes
- Unit: `list.use-case.spec.ts`
- E2E: `list.controller.spec.ts`
