# Unread Count

Conta as notificacoes nao lidas do usuario (badge do sino).

## Endpoint
`GET /notifications/unread-count` | Auth: Sim

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Controller chama `repository.countUnread(request.user.sub)` direto (sem use-case)
3. Retorna `{ count }`

## Erros
| Code | Cause | Quando |
|------|-------|--------|
| 500 | (erro interno) | Falha na contagem |
