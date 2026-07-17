# Menu Bulk Delete (Hard Delete em Lote)

Exclui permanentemente múltiplos menus que já estejam na lixeira.

## Endpoint

`DELETE /menu/bulk-delete`

## Middleware

1. `AuthenticationMiddleware({ optional: false })` — roda primeiro
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)`

## Body

```json
{ "ids": ["<menuId1>", "<menuId2>"] }
```

## Response

```json
{ "deleted": 5 }
```

## Comportamento

- Para cada `id` informado, valida que o menu está com `trashed=true`. Os
  que não estão são silenciosamente ignorados.
- Executa `deleteMany` apenas sobre os IDs validados.

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem a capacidade MANAGE_MENU |
| 500 | BULK_DELETE_MENUS_ERROR | Erro interno |
