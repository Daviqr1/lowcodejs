# Mark As Read

Marca uma notificacao especifica como lida.

## Endpoint
`PATCH /notifications/:_id/read` | Auth: Sim

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Controller chama `repository.markAsRead(params._id, request.user.sub)` direto
3. Se nao encontrada (ou nao pertence ao usuario): 404
4. Retorna a notificacao atualizada

## Erros
| Code | Cause | Quando |
|------|-------|--------|
| 404 | (nao encontrada) | `_id` inexistente ou de outro usuario |
| 500 | (erro interno) | Falha ao marcar |
