# Reset Password

Atualiza a senha do usuario usando um token de autenticacao valido obtido apos validacao do codigo.

## Endpoint
`PUT /authentication/recovery/update-password` | Auth: Sim | Permission: Nenhuma

## Fluxo
1. Middleware: `AuthenticationMiddleware({ optional: false })`
2. Validator: `ResetPasswordBodyValidator` - campos: `password` (string, min 6, regex maiuscula+minuscula+numero+especial, required, trim)
3. Controller: Extrai `_id` de `request.user.sub` e merge com body validado
4. UseCase: `UpdatePasswordRecoveryUseCase`
   - Busca usuario por `_id` via `userRepository.findBy({ _id, exact: true })`
   - Se usuario nao encontrado, retorna Left (404 USER_NOT_FOUND)
   - Faz hash da nova senha com bcrypt (salt 6)
   - Atualiza senha via `userRepository.update({ _id, password: hashedPassword })`
   - Retorna Right com null
5. Repository: `UserContractRepository.findBy`, `UserContractRepository.update`

## Regras de Negocio
- Usuario deve estar autenticado (token JWT valido)
- Senha deve ter no minimo 6 caracteres
- Senha deve conter ao menos: 1 maiuscula, 1 minuscula, 1 numero e 1 caractere especial
- Senha e hashada com bcrypt (salt rounds = 6) antes de salvar
- O `_id` do usuario e extraido do JWT (`request.user.sub`), nao do body

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 400 | INVALID_PAYLOAD_FORMAT | Body falha na validacao Zod/AJV |
| 400 | INVALID_TOKEN | Token de recuperacao invalido |
| 401 | AUTHENTICATION_REQUIRED | Middleware rejeita (sem token) |
| 404 | USER_NOT_FOUND | Usuario nao encontrado no banco |
| 500 | UPDATE_PASSWORD_ERROR | Erro interno |

## Testes
- Unit: `reset-password.use-case.spec.ts`
- E2E: `reset-password.controller.spec.ts`
