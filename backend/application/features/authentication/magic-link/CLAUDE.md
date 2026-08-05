# Magic Link

Autentica o usuario via magic link (codigo na query string) e redireciona para o dashboard.

## Endpoint
`GET /authentication/magic-link` | Auth: Nao | Permission: Nenhuma

## Fluxo
1. Middleware: Nenhum
2. Validator: `MagicLinkQueryValidator` - campos: `code` (string, min 1, required, trim) via query string
3. UseCase: `MagicLinkUseCase`
   - Busca token de validacao por codigo exato via `validationTokenRepository.findBy({ code, exact: true })`
   - Se token nao encontrado, retorna Left (404 VALIDATION_TOKEN_NOT_FOUND)
   - Se token ja foi usado (`E_TOKEN_STATUS.VALIDATED`), retorna Left (409 VALIDATION_TOKEN_ALREADY_USED)
   - Se token ja expirado (`E_TOKEN_STATUS.EXPIRED`), retorna Left (410 VALIDATION_TOKEN_EXPIRED)
   - Calcula diferenca de tempo com `differenceInMinutes(now, token.createdAt)`
   - Se diferenca > 10 minutos, atualiza status para EXPIRED e retorna Left (410 VALIDATION_TOKEN_EXPIRED)
   - Atualiza status do token para VALIDATED
   - Busca usuario associado via `userRepository.findBy({ _id: token.user._id, exact: true })`
   - Se usuario nao encontrado, retorna Left (404 USER_NOT_FOUND)
   - Se usuario inativo, ativa automaticamente (`userRepository.update` com status ACTIVE)
   - Retorna Right com entidade User
4. Controller: Cria tokens JWT via `createTokens()`, seta cookies via `setCookieTokens()`, redireciona (302) para `APP_CLIENT_URL/dashboard?authentication=success`
5. Repository: `ValidationTokenContractRepository.findBy`, `ValidationTokenContractRepository.update`, `UserContractRepository.findBy`, `UserContractRepository.update`

## Regras de Negocio
- Codigo de magic link deve existir e estar com status REQUESTED
- Token expira em 10 minutos apos criacao
- Token usado uma unica vez (status muda para VALIDATED)
- Usuario inativo e automaticamente ativado ao usar magic link
- Redireciona para o frontend com cookies JWT setados

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | VALIDATION_TOKEN_NOT_FOUND | Codigo nao encontrado no banco |
| 404 | USER_NOT_FOUND | Usuario associado ao token nao encontrado |
| 409 | VALIDATION_TOKEN_ALREADY_USED | Token ja foi utilizado |
| 410 | VALIDATION_TOKEN_EXPIRED | Token expirado (status ou tempo > 10min) |
| 500 | MAGIC_LINK_ERROR | Erro interno |

## Testes
- Unit: `magic-link.use-case.spec.ts`
- E2E: `magic-link.controller.spec.ts`
