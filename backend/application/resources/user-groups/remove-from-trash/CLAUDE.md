# UserGroup Remove From Trash

Restaura um grupo da lixeira.

## Endpoint

`PATCH /user-group/:_id/restore`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS)`

## Regras

- Bloqueia grupos do sistema (slug ∈ {MASTER, ADMINISTRATOR, MANAGER, REGISTERED}).

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USER_GROUPS |
| 403 | SYSTEM_GROUP_PROTECTED | Grupo do sistema |
| 404 | USER_GROUP_NOT_FOUND | Grupo inexistente |
| 409 | NOT_TRASHED | Não está na lixeira |
| 500 | REMOVE_GROUP_FROM_TRASH_ERROR | Erro interno |
