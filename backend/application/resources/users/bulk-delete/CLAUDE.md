# User Bulk Delete (Hard Delete em Lote)

Exclui permanentemente múltiplos usuários que já estejam na lixeira.

## Endpoint

`DELETE /users/bulk-delete`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS)`

## Body

```json
{ "ids": ["<userId1>", "<userId2>"] }
```

## Regras

- Bloqueia se `actorId` está nos ids.
- Filtra apenas usuários `trashed=true`.
- Filtra usuários sem tabelas associadas (`OWNER_OF_TABLES`).

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USERS |
| 409 | CANNOT_DELETE_SELF | Auto-delete |
| 500 | BULK_DELETE_USERS_ERROR | Erro interno |
