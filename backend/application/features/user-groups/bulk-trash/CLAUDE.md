# UserGroup Bulk Trash

Envia múltiplos grupos para a lixeira.

## Endpoint

`PATCH /user-group/bulk-trash`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS)`

## Body

```json
{ "ids": ["<groupId1>", "<groupId2>"] }
```

## Regras

- Ignora silenciosamente grupos do sistema, com usuários ou já trashed.
- Retorna `modified` apenas dos elegíveis.

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem capability MANAGE_USER_GROUPS |
| 500 | BULK_TRASH_GROUPS_ERROR | Erro interno |
