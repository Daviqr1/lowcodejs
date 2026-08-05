# UserGroup Send to Trash

Envia um grupo de usuários para a lixeira (soft delete).

## Endpoint

`PATCH /user-group/:_id/trash`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS)`

## Regras

- Bloqueia grupos do sistema (slug ∈ {MASTER, ADMINISTRATOR, MANAGER, REGISTERED}).
- Bloqueia grupos com usuários atribuídos.

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USER_GROUPS |
| 403 | SYSTEM_GROUP_PROTECTED | Grupo do sistema |
| 404 | USER_GROUP_NOT_FOUND | Grupo inexistente |
| 409 | ALREADY_TRASHED | Já está na lixeira |
| 409 | GROUP_HAS_USERS | Possui usuários |
| 500 | SEND_GROUP_TO_TRASH_ERROR | Erro interno |
