# User Delete (Hard Delete)

Exclui permanentemente um usuário que esteja na lixeira.

## Endpoint

`DELETE /users/:_id`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS)`

## Regras

- Bloqueia auto-delete (`_id === request.user.sub`).
- Apenas usuários com `trashed=true` podem ser excluídos permanentemente.
- Bloqueia exclusão se o usuário é dono de tabelas (`OWNER_OF_TABLES`).

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USERS |
| 404 | USER_NOT_FOUND | Usuário não encontrado |
| 409 | CANNOT_DELETE_SELF | Auto-delete |
| 409 | NOT_TRASHED | Usuário não está na lixeira |
| 409 | OWNER_OF_TABLES | Usuário é dono de tabelas |
| 500 | DELETE_USER_ERROR | Erro interno |
