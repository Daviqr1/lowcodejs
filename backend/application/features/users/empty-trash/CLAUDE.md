# User Empty Trash

Esvazia a lixeira de usuários, excluindo permanentemente todos os usuários
com `trashed=true` que não sejam donos de tabelas.

## Endpoint

`DELETE /users/empty-trash`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS)`

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USERS |
| 500 | EMPTY_TRASH_USERS_ERROR | Erro interno |
