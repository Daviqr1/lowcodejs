# Menu Bulk Restore

Restaura múltiplos menus que estão na lixeira.

## Endpoint

`PATCH /menu/bulk-restore`

## Middleware

1. `AuthenticationMiddleware({ optional: false })` — roda primeiro
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)`

## Body

```json
{ "ids": ["<menuId1>", "<menuId2>"] }
```

## Response

```json
{ "modified": 5 }
```

## Comportamento

- Filtra apenas menus com `trashed=true` (`filterTrashed: true`).
- Define `trashed=false` e `trashedAt=null`.

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem a capacidade MANAGE_MENU |
| 500 | BULK_RESTORE_MENUS_ERROR | Erro interno |
