# User Remove From Trash

Restaura um usuário da lixeira.

## Endpoint

`PATCH /users/:_id/restore`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS)`

## Regras

- Apenas usuários com `trashed=true` podem ser restaurados.

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USERS |
| 404 | USER_NOT_FOUND | Usuário não encontrado na lixeira |
| 409 | NOT_TRASHED | Usuário não está na lixeira |
| 500 | REMOVE_USER_FROM_TRASH_ERROR | Erro interno |
