# Delete Menu (Exclusao Permanente)

Remove permanentemente um menu que ja esta na lixeira.

## Endpoint
`DELETE /menu/:_id` | Auth: Yes | Permission: `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)`

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Validator: MenuDeleteParamValidator - campos: _id (string, required, min 1)
3. UseCase:
   - Busca o menu pelo _id (trashed: true)
   - Verifica se o menu esta na lixeira (trashed=true)
   - Remove permanentemente via menuRepository.delete
   - Retorna null
4. Repository: MenuContractRepository (findById, delete)

## Regras de Negocio
- Somente menus que ja estao na lixeira (trashed=true) podem ser excluidos permanentemente
- Remove o documento permanentemente do banco de dados
- Retorna 200 com body null

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | MENU_NOT_FOUND | Menu nao encontrado |
| 409 | NOT_TRASHED | Menu nao esta na lixeira |
| 500 | DELETE_MENU_ERROR | Erro interno |

## Testes
- Unit: `delete.use-case.spec.ts`
- E2E: nao existe ainda
