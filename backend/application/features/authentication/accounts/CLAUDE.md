# Linked Accounts

Lista as contas vinculadas do usuario (multi-conta) para o seletor de conta ativa.

## Endpoint
`GET /authentication/accounts` | Auth/Permission: Auth

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
Cookie `activeAccountId`. Ver `utils/cookies.util`.
