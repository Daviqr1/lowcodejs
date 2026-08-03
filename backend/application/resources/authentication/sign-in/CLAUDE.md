# Sign In

Autentica um usuario com email e senha, retornando tokens JWT como cookies HTTP-only.

## Endpoint
`POST /authentication/sign-in` | Auth: Nao | Permission: Nenhuma

## Fluxo
1. Middleware: Nenhum
2. Validator: `SignInBodyValidator` - campos: `email` (string, email, required, trim), `password` (string, min 1, required, trim)
3. UseCase: `SignInUseCase`
   - Busca usuario por email via `userRepository.findByEmail(email)` — o finder
     ja filtra `trashed: false`, entao usuario na lixeira nao e encontrado
   - Se nao encontrar (inexistente **ou** na lixeira), retorna Left (401 INVALID_CREDENTIALS)
   - Se usuario inativo (`E_USER_STATUS.INACTIVE`), retorna Left (401 USER_INACTIVE)
   - Compara senha com bcrypt (`bcrypt.compare`)
   - Se senha nao confere, retorna Left (401 INVALID_CREDENTIALS)
   - Retorna Right com entidade User
4. Controller: Cria tokens JWT via `createTokens()`, limpa cookies antigos via `clearCookieTokens()`, seta novos cookies via `setCookieTokens()`
5. Repository: `UserContractRepository.findBy`

## Regras de Negocio
- Email deve existir no banco de dados
- Usuario na lixeira (`trashed: true`) **nao autentica** — cai no mesmo
  INVALID_CREDENTIALS de email inexistente, sem revelar que a conta existe
- Usuario deve estar com status ACTIVE
- Senha deve corresponder ao hash armazenado (bcrypt)
- Tokens (accessToken + refreshToken) sao setados como cookies HTTP-only

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 400 | INVALID_PAYLOAD_FORMAT | Body falha na validacao Zod/AJV |
| 401 | INVALID_CREDENTIALS | Email nao encontrado ou senha incorreta |
| 401 | USER_INACTIVE | Usuario com status INACTIVE |
| 500 | SIGN_IN_ERROR | Erro interno (banco, etc) |

## Testes
- Unit: `sign-in.use-case.spec.ts`
- E2E: `sign-in.controller.spec.ts`
