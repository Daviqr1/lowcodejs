# User Bulk Update (status)

Altera o `status` (ACTIVE/INACTIVE) de múltiplos usuários de uma vez. Usado pela
ação em lote "Alterar status" na tela de Usuários.

## Endpoint

`PATCH /users/bulk-update`

## Middleware

1. `AuthenticationMiddleware({ optional: false })`
2. `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS)`

## Body

```json
{ "ids": ["<userId1>", "<userId2>"], "status": "ACTIVE" }
```

## Regras

- O **próprio usuário** (actorId = `request.user.sub`) é sempre **excluído** da
  operação — evita auto-bloqueio ao desativar a si mesmo (inclusive em
  "selecionar todos"). Se só o próprio foi selecionado, retorna `modified: 0`.
- Aplica `updateMany` com `filterTrashed: false` (não mexe em usuários na
  lixeira).
- `ids` min 1, max 500. `status` deve ser `ACTIVE` ou `INACTIVE`.

## Erros

| Code | Cause                   | Quando                      |
| ---- | ----------------------- | --------------------------- |
| 400  | INVALID_PAYLOAD_FORMAT  | ids vazio / status inválido |
| 401  | AUTHENTICATION_REQUIRED | Sem token                   |
| 403  | FORBIDDEN               | Sem capability MANAGE_USERS  |
| 500  | BULK_UPDATE_USERS_ERROR | Erro interno                |

## Testes

- Unit: `bulk-update.use-case.spec.ts`
- E2E: `bulk-update.controller.spec.ts`
