# Show User

Busca um usuario especifico por ID (senha excluida da resposta).

## Endpoint
`GET /users/:_id` | Auth: Yes | Permission: MANAGE_USERS

## Fluxo
1. Middleware: `AuthenticationMiddleware({ optional: false })` seguido de `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS)`
2. Validator: `UserShowParamValidator` - campos: _id (string, required, trim, min 1)
3. UseCase: `UserShowUseCase`
   - Busca usuario por _id exato no repositorio
   - Se nao encontrado, retorna 404
   - Retorna usuario encontrado
4. Repository: `UserContractRepository` - `findBy({ _id, exact: true })`

## Regras de Negocio
- Controller remove `password` da resposta (seta como undefined)
- Busca e feita com `exact: true`

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Token JWT ausente ou invalido |
| 404 | USER_NOT_FOUND | Usuario com _id informado nao existe |
| 500 | GET_USER_BY_ID_ERROR | Erro interno (banco, etc) |

## Testes
- Unit: `show.use-case.spec.ts`
- E2E: `show.controller.spec.ts`
