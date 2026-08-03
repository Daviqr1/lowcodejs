# Sign Up

Registra um novo usuario com nome, email e senha. Envia e-mail de boas-vindas.

## Endpoint
`POST /authentication/sign-up` | Auth: Nao | Permission: Nenhuma

## Fluxo
1. Middleware: Nenhum
2. Validator: `SignUpBodyValidator` - campos: `name` (string, min 1, required, trim), `email` (string, email, required, trim), `password` (string, min 6, regex maiuscula+minuscula+numero+especial, required, trim)
3. UseCase: `SignUpUseCase`
   - Busca usuario por email via `findByEmail(email)` e, se nao achar, repete com
     `{ trashed: true }` — o e-mail nao tem indice unique no model, entao um
     e-mail na lixeira tambem precisa bloquear o registro
   - Se usuario ja existe (ativo ou na lixeira), retorna Left (409 USER_ALREADY_EXISTS)
   - Busca grupo REGISTERED via `userGroupRepository.findBy({ slug: E_ROLE.REGISTERED, exact: true })`
   - Se grupo nao encontrado, retorna Left (409 GROUP_NOT_FOUND)
   - Faz hash da senha com bcrypt (salt 6)
   - Cria usuario via `userRepository.create()` com status ACTIVE e grupo REGISTERED
   - Dispara e-mail de boas-vindas assincronamente (template `sign-up`) via `emailService`
   - Retorna Right com entidade User criada
4. Repository: `UserContractRepository.findBy`, `UserContractRepository.create`, `UserGroupContractRepository.findBy`
5. Service: `EmailContractService.buildTemplate`, `EmailContractService.sendEmail`

## Regras de Negocio
- Email nao pode ja estar cadastrado — inclusive por usuario na lixeira
- Grupo REGISTERED deve existir no banco (seeder)
- Senha hashada com bcrypt (salt rounds = 6)
- Usuario criado com status ACTIVE e role REGISTERED
- E-mail de boas-vindas e disparado de forma fire-and-forget (nao bloqueia resposta)

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 400 | INVALID_PAYLOAD_FORMAT | Body falha na validacao Zod/AJV |
| 409 | USER_ALREADY_EXISTS | Email ja cadastrado |
| 409 | GROUP_NOT_FOUND | Grupo REGISTERED nao existe no banco |
| 500 | SIGN_UP_ERROR | Erro interno (banco, email, etc) |

## Testes
- Unit: `sign-up.use-case.spec.ts`
- E2E: `sign-up.controller.spec.ts`
