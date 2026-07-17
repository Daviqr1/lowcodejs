# User Bulk Restore

Restaura múltiplos usuários da lixeira.

## Endpoint

`PATCH /users/bulk-restore`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS)`

## Body

```json
{ "ids": ["<userId1>", "<userId2>"] }
```

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USERS |
| 500 | BULK_RESTORE_USERS_ERROR | Erro interno |
