# Show Profile

Retorna o perfil do usuario autenticado.

## Endpoint
`GET /profile` | Auth: Yes | Permission: -

## Fluxo
1. Middleware: `AuthenticationMiddleware({ optional: false })`
2. Validator: nenhum (ID vem do token JWT via `request.user.sub`)
3. UseCase: `ProfileShowUseCase`
   - Busca usuario por _id exato (vindo do token JWT)
   - Se nao encontrado, retorna 404
   - Retorna usuario encontrado
4. Repository: `UserContractRepository` - `findBy({ _id, exact: true })`

## Regras de Negocio
- ID do usuario extraido do token JWT (`request.user.sub`), nao de parametros
- Retorna usuario com grupo e permissoes populadas
- Inclui `capabilities: string[]` — uniao das permissoes (slugs) do fecho de
  grupos do usuario (`resolveCapabilities`). O frontend usa para liberar a
  navegacao por capability (MANAGE_*), nao por role legado

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Token JWT ausente ou invalido |
| 404 | USER_NOT_FOUND | Usuario do token nao encontrado no banco |
| 500 | GET_USER_PROFILE_ERROR | Erro interno (banco, etc) |

## Testes
- Unit: `show.use-case.spec.ts`
- E2E: `show.controller.spec.ts`
