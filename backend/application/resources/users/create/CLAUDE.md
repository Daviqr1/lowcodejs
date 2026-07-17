# Create User

Cria um novo usuario com nome, email, senha e grupo.

## Endpoint
`POST /users` | Auth: Yes | Permission: MANAGE_USERS

## Fluxo
1. Middleware: `AuthenticationMiddleware({ optional: false })` seguido de `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS)`
2. Validator: `UserCreateBodyValidator` - campos: name (string, required, trim, min 1), email (string, email, trim), group (string, required, min 1), password (string, trim, min 6, regex PASSWORD_REGEX)
3. UseCase: `UserCreateUseCase`
   - Valida que `group` foi informado (retorna 400 se ausente)
   - Busca usuario por email exato no repositorio
   - Se ja existe, retorna 409 CONFLICT
   - Gera hash da senha com bcrypt (salt 12)
   - Cria usuario com status `E_USER_STATUS.ACTIVE`
   - Enfileira email de boas-vindas (template `user-created`) na fila BullMQ — worker processa async com retry
   - Retorna usuario criado
4. Repository: `UserContractRepository` - `findBy({ email, exact: true })`, `create()`
5. Service: `EmailQueueContractService.enqueue` (worker chama `EmailContractService` internamente)

## Regras de Negocio
- Group e obrigatorio (validacao no use-case alem do validator)
- Email deve ser unico (busca exata por email)
- Senha e hasheada com bcrypt salt 12
- Usuario criado sempre com status ACTIVE
- Senha deve conter: 1 maiuscula, 1 minuscula, 1 numero e 1 caractere especial
- Email de boas-vindas e enfileirado via BullMQ; worker processa async com 3 retries (backoff exponencial). Se enqueue falhar (Redis fora), use-case retorna 500

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 400 | GROUP_NOT_INFORMED | Group nao informado no payload |
| 401 | AUTHENTICATION_REQUIRED | Token JWT ausente ou invalido |
| 409 | USER_ALREADY_EXISTS | Ja existe usuario com mesmo email |
| 500 | CREATE_USER_ERROR | Erro interno (banco, etc) |

## Testes
- Unit: `create.use-case.spec.ts`
- E2E: `create.controller.spec.ts`
