# Menu Empty Trash (Esvaziar Lixeira)

Remove permanentemente todos os menus que estão na lixeira.

## Endpoint

`DELETE /menu/empty-trash`

## Middleware

1. `AuthenticationMiddleware({ optional: false })` — roda primeiro
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)`

## Response

```json
{ "deleted": 5 }
```

## Comportamento

- Carrega todos os menus com `trashed=true` via `findManyTrashed`.
- Aplica `deleteMany` sobre todos os IDs.
- Operação irreversível.

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | AUTHENTICATION_REQUIRED | Sem token |
| 403 | FORBIDDEN | Sem a capacidade MANAGE_MENU |
| 500 | EMPTY_TRASH_MENUS_ERROR | Erro interno |
