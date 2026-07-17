# UserGroup Bulk Restore

Restaura múltiplos grupos da lixeira.

## Endpoint

`PATCH /user-group/bulk-restore`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS)`

## Body

```json
{ "ids": ["<groupId1>", "<groupId2>"] }
```

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USER_GROUPS |
| 500 | BULK_RESTORE_GROUPS_ERROR | Erro interno |
