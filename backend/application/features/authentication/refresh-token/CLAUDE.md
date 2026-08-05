# Refresh Token

Renova os tokens de acesso e refresh usando o refresh token atual dos cookies.

## Endpoint
`POST /authentication/refresh-token` | Auth: Nao (autenticacao via refresh token cookie) | Permission: Nenhuma

## Fluxo
1. Middleware: `AuthenticationMiddleware({ optional: true })` — nao bloqueia request sem access token. A autenticacao real do endpoint vem da posse do refresh token (cookie httpOnly assinado RS256), validado nos passos 3-4.
2. Validator: `RefreshTokenPayload` (type apenas, nao Zod) - campos: `_id` (string, extraido do token decodificado)
3. Controller (logica pre-use-case):
   - Extrai `refreshToken` de `request.cookies.refreshToken`
   - Se ausente, retorna 401 MISSING_REFRESH_TOKEN
   - Decodifica token via `request.server.jwt.decode(refreshToken)`
   - Se invalido ou tipo nao e REFRESH (`E_JWT_TYPE.REFRESH`), retorna 401 INVALID_REFRESH_TOKEN
4. UseCase: `RefreshTokenUseCase`
   - Busca usuario por `_id` (sub do token) via `userRepository.findBy({ _id, exact: true })`
   - Se usuario nao encontrado, retorna Left (404 USER_NOT_FOUND)
   - Retorna Right com entidade User
5. Controller (pos-use-case): Cria novos tokens JWT via `createTokens()`, seta cookies via `setCookieTokens()`
6. Repository: `UserContractRepository.findBy`

## Regras de Negocio
- Cookie de refreshToken deve estar presente
- Refresh token deve ser valido e do tipo REFRESH
- Usuario referenciado no token deve existir
- Novos accessToken e refreshToken sao gerados e setados como cookies
- Endpoint **nao** exige access token valido (renovacao funciona mesmo apos expiracao do access token)

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 401 | MISSING_REFRESH_TOKEN | Cookie refreshToken ausente |
| 401 | INVALID_REFRESH_TOKEN | Token invalido, expirado ou tipo incorreto |
| 404 | USER_NOT_FOUND | Usuario do token nao existe no banco |
| 500 | REFRESH_TOKEN_ERROR | Erro interno |

## Testes
- Unit: `refresh-token.use-case.spec.ts`
- E2E: `refresh-token.controller.spec.ts`
