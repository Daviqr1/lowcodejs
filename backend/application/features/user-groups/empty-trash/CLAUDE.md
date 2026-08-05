# UserGroup Empty Trash

Esvazia a lixeira de grupos, excluindo permanentemente todos os grupos
não-sistema sem usuários atribuídos.

## Endpoint

`DELETE /user-group/empty-trash`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS)`

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USER_GROUPS |
| 500 | EMPTY_TRASH_GROUPS_ERROR | Erro interno |
