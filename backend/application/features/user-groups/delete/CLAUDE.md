# UserGroup Delete (Hard Delete)

Exclui permanentemente um grupo na lixeira.

## Endpoint

`DELETE /user-group/:_id`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS)`

## Regras

- Bloqueia grupos do sistema.
- Apenas `trashed=true`.
- Bloqueia se tiver usuários atribuídos.

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USER_GROUPS |
| 403 | SYSTEM_GROUP_PROTECTED | Grupo do sistema |
| 404 | USER_GROUP_NOT_FOUND | Não encontrado |
| 409 | NOT_TRASHED | Não está na lixeira |
| 409 | GROUP_HAS_USERS | Possui usuários |
| 500 | DELETE_GROUP_ERROR | Erro interno |
