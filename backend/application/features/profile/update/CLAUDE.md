# Update Profile

Atualiza o perfil do usuario autenticado, com troca de senha opcional.

## Endpoint
`PUT /profile` | Auth: Yes | Permission: -

## Fluxo
1. Middleware: `AuthenticationMiddleware({ optional: false })`
2. Validator: `ProfileUpdateBodyValidator` - campos: name (string, required, min 1, trim), email (string, required, email, trim), currentPassword (string, trim, optional), newPassword (string, min 6, regex PASSWORD_REGEX, trim, optional), allowPasswordChange (boolean, default false)
3. UseCase: `ProfileUpdateUseCase`
   - Busca usuario por _id exato (vindo do token JWT)
   - Se nao encontrado, retorna 404
   - Se `allowPasswordChange` e false: atualiza apenas name, email (mantem grupo original)
   - Se `allowPasswordChange` e true:
     - Verifica currentPassword contra hash salvo via `isPasswordMatch()`
     - Se senha atual invalida, retorna 401 INVALID_CREDENTIALS
     - Gera hash da nova senha com bcrypt (salt 6)
     - Atualiza name, email, password (mantem grupo original)
   - Retorna usuario atualizado
4. Repository: `UserContractRepository` - `findBy({ _id, exact: true })`, `update()`

## Regras de Negocio
- ID do usuario extraido do token JWT (`request.user.sub`)
- name e email sao obrigatorios (PUT, nao PATCH)
- Grupo nao e alteravel pelo perfil (usa `user.group._id` original)
- Troca de senha requer `allowPasswordChange: true` + `currentPassword` + `newPassword`
- Senha atual e verificada antes de permitir troca
- Nova senha hasheada com bcrypt salt 6

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 400 | INVALID_PAYLOAD_FORMAT | Falha na validacao Zod |
| 401 | AUTHENTICATION_REQUIRED | Token JWT ausente ou invalido |
| 401 | INVALID_CREDENTIALS | Senha atual informada nao confere |
| 404 | USER_NOT_FOUND | Usuario do token nao encontrado no banco |
| 500 | UPDATE_USER_PROFILE_ERROR | Erro interno (banco, etc) |

## Testes
- Unit: `update.use-case.spec.ts`
- E2E: `update.controller.spec.ts`
