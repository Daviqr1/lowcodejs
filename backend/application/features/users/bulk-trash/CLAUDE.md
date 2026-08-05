# User Bulk Trash

Envia múltiplos usuários para a lixeira.

## Endpoint

`PATCH /users/bulk-trash`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS)`

## Body

```json
{ "ids": ["<userId1>", "<userId2>"] }
```

## Regras

- Bloqueia se o `actorId` (request.user.sub) estiver na lista de ids.
- Apenas usuários com `trashed=false` são afetados.

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USERS |
| 409 | CANNOT_TRASH_SELF | Auto-trash |
| 500 | BULK_TRASH_USERS_ERROR | Erro interno |
