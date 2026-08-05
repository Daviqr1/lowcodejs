# Show User Group

Busca um grupo de usuarios especifico por ID.

## Endpoint
`GET /user-group/:_id` | Auth: Yes | Permission: MANAGE_USER_GROUPS

## Fluxo
1. Middleware: `AuthenticationMiddleware({ optional: false })` seguido de `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS)`
2. Validator: `UserGroupShowParamValidator` - campos: _id (string, required, trim, min 1)
3. UseCase: `UserGroupShowUseCase`
   - Busca grupo por _id exato no repositorio
   - Se nao encontrado, retorna 404
   - Retorna grupo encontrado
4. Repository: `UserGroupContractRepository` - `findBy({ _id, exact: true })`

## Regras de Negocio
- Busca e feita com `exact: true`
- Retorna grupo com permissoes populadas

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 400 | INVALID_PAYLOAD_FORMAT | Falha na validacao do _id |
| 401 | AUTHENTICATION_REQUIRED | Token JWT ausente ou invalido |
| 404 | USER_GROUP_NOT_FOUND | Grupo com _id informado nao existe |
| 500 | GET_USER_GROUP_BY_ID_ERROR | Erro interno (banco, etc) |

## Testes
- Unit: `show.use-case.spec.ts`
- E2E: `show.controller.spec.ts`
