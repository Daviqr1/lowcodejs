# Utils

Funcoes utilitarias de infraestrutura.

## `jwt.util.ts`

`createTokens(user, response)` - Gera par de tokens JWT:
- **AccessToken**: 24h, tipo ACCESS, payload: `{ sub, email, role, type }`
- **RefreshToken**: 7d, tipo REFRESH
- Algoritmo: RS256 (chaves publica/privada em base64 via env)

## `cookies.util.ts`

Cookies de auth **e** suporte a **multi-conta** (até `MAX_AUTH_ACCOUNTS = 2`
sessões simultâneas por navegador). Constantes: `ACCESS_TOKEN_COOKIE`,
`REFRESH_TOKEN_COOKIE`, `ACTIVE_ACCOUNT_COOKIE`.

### Leitura

| Funcao | Descricao |
|--------|-----------|
| `getRequestCookie(request, name)` | Lê um cookie (header `cookie` cru **ou** `request.cookies`). **Só cookie — sem fallback de header `Authorization`** |
| `getActiveAccountId(request)` | Id da conta ativa (cookie `activeAccountId`) |
| `readAccountSessions(request)` / `listAccountIds(request)` | Sessões multi-conta persistidas e seus ids |
| `extractLastCookieValue(header, name)` | Helper: último valor de um cookie repetido |

### Escrita

| Funcao | Descricao |
|--------|-----------|
| `setCookieTokens(response, tokens)` | Define `accessToken` + `refreshToken`. httpOnly, sameSite=none(prod)/lax(dev), secure=prod-only |
| `clearCookieTokens(response)` | Limpa ambos cookies |
| `setActiveSession(...)` / `setActiveAccountCookie(...)` | Marca a conta ativa da sessão |
| `writeAccountSessions(...)` / `clearAccountSessions(...)` | Persiste/limpa o mapa de sessões multi-conta |
| `clearActiveAccountCookie(...)` / `clearAllSessions(...)` | Limpa a conta ativa / todas as sessões |

Domínio opcional via `Env.COOKIE_DOMAIN`. Consumido por `authentication/`
(sign-in/out, accounts, switch-account) e pelo `AuthenticationMiddleware`.
