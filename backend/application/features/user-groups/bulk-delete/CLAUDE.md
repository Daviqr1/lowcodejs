# UserGroup Bulk Delete (Hard Delete em Lote)

Exclui permanentemente múltiplos grupos que estejam na lixeira.

## Endpoint

`DELETE /user-group/bulk-delete`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS)`

## Body

```json
{ "ids": ["<groupId1>", "<groupId2>"] }
```

## Regras

- Apenas `trashed=true`.
- Ignora grupos do sistema.
- Ignora grupos com usuários atribuídos.

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USER_GROUPS |
| 500 | BULK_DELETE_GROUPS_ERROR | Erro interno |
