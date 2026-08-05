# Sign Out

Realiza o logout do usuario limpando os cookies de autenticacao.

## Endpoint
`POST /authentication/sign-out` | Auth: Sim | Permission: Nenhuma

## Fluxo
1. Middleware: `AuthenticationMiddleware({ optional: false })`
2. Validator: Nenhum (sem body)
3. UseCase: `SignOutUseCase` - apenas retorna Right com mensagem de sucesso (logica minima)
4. Controller: Limpa cookies via `clearCookieTokens(response)`, retorna 200
5. Repository: Nenhum

## Regras de Negocio
- Usuario deve estar autenticado (token valido no cookie)
- Cookies de accessToken e refreshToken sao removidos

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Token de acesso ausente ou invalido |

## Testes
- Unit: `sign-out.use-case.spec.ts`
- E2E: `sign-out.controller.spec.ts`
