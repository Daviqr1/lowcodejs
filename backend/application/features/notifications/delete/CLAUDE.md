# Delete Notification

Remove uma notificacao do usuario.

## Endpoint
`DELETE /notifications/:_id` | Auth: Sim

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Controller chama `repository.delete(params._id, request.user.sub)` direto
3. Se nao encontrada (ou de outro usuario): 404
4. Retorna `{ ok: true }`

## Erros
| Code | Cause | Quando |
|------|-------|--------|
| 404 | (nao encontrada) | `_id` inexistente ou de outro usuario |
| 500 | (erro interno) | Falha ao remover |
