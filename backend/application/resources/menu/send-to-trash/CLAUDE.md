# Send Menu to Trash (Soft Delete)

Envia um menu para a lixeira (soft delete).

## Endpoint
`PATCH /menu/:_id/trash` | Auth: Yes | Permission: `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)`

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Validator: MenuSendToTrashParamValidator - campos: _id (string, required, min 1)
3. UseCase:
   - Busca o menu pelo _id (nao-trashed)
   - Conta filhos ativos (nao-trashed) do menu
   - Se tem filhos ativos, bloqueia a exclusao
   - Marca trashed=true e trashedAt=now via menuRepository.update
   - Retorna null
4. Repository: MenuContractRepository (findById, count, update)

## Regras de Negocio
- NAO permite enviar para lixeira menu que possui filhos ativos (nao-trashed)
- E um soft delete: marca trashed=true e trashedAt com data atual
- Retorna 200 com body null

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | MENU_NOT_FOUND | Menu nao encontrado ou ja esta na lixeira |
| 409 | MENU_HAS_CHILDREN | Menu possui filhos ativos |
| 500 | SEND_TO_TRASH_MENU_ERROR | Erro interno |

## Testes
- Unit: `send-to-trash.use-case.spec.ts`
- E2E: `send-to-trash.controller.spec.ts`
