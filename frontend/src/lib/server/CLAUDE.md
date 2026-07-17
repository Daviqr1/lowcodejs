# Funcoes de Servidor (TanStack React Start)

Server functions criadas com `createServerFn` do TanStack React Start para
autenticacao e utilitarios de cookies. Executam no servidor e sao chamadas pelo
cliente como RPCs.

## Arquivos

| Arquivo              | Descricao                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `auth.ts`            | `serverSignIn` e `serverSignOut` para autenticacao via API backend                                                |
| `get-cookies.ts`     | `getServerCookies` retorna os cookies da requisicao atual                                                         |
| `refresh-session.ts` | `serverRefreshSession` — server function (POST) que renova o token/sessao no SSR repassando os cookies ao backend |

## serverSignIn

Fluxo em 5 etapas:

1. Valida input com Zod (`email` + `password`)
2. Faz POST para `{VITE_API_BASE_URL}/authentication/sign-in` com credentials
3. Se falhar, lanca erro com mensagem do backend
4. Extrai header `set-cookie` da resposta e faz GET para
   `{VITE_API_BASE_URL}/profile` repassando o cookie
5. Retorna os dados do perfil do usuario como JSON

## serverSignOut

1. Obtem cookies da requisicao atual via `getRequestHeader('Cookie')`
2. Faz POST para `{VITE_API_BASE_URL}/authentication/sign-out` repassando os
   cookies

## getServerCookies

Utilitario simples que retorna o header `Cookie` da requisicao atual usando
`getRequestHeader` do TanStack React Start. Retorna string vazia se nao houver
cookies.

## Variavel de Ambiente

| Variavel            | Uso                                                              |
| ------------------- | ---------------------------------------------------------------- |
| `VITE_API_BASE_URL` | URL base da API backend, acessada via `Env` importado de `@/env` |
