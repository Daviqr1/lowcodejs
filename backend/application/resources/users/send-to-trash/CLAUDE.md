# User Send to Trash (Soft Delete)

Envia um usuário para a lixeira (soft delete).

## Endpoint

`PATCH /users/:_id/trash`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS)`

## Regras

- Bloqueia auto-trash (`_id === request.user.sub`).
- Bloqueia ADMIN tentando trashar usuário MASTER.
- Apenas usuários ativos (não-trashed) são afetados.

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USERS |
| 403 | CANNOT_TRASH_MASTER | ADMIN tentando trashar MASTER |
| 404 | USER_NOT_FOUND | Usuário inexistente |
| 409 | CANNOT_TRASH_SELF | Auto-trash |
| 409 | ALREADY_TRASHED | Já está na lixeira |
| 500 | SEND_USER_TO_TRASH_ERROR | Erro interno |
