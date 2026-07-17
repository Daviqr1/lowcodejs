# Mark All As Read

Marca todas as notificacoes do usuario como lidas.

## Endpoint
`PATCH /notifications/read-all` | Auth: Sim

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Controller chama `repository.markAllAsRead(request.user.sub)` direto
3. Retorna `{ updated }` (quantidade marcada)

## Erros
| Code | Cause | Quando |
|------|-------|--------|
| 500 | (erro interno) | Falha ao marcar |
