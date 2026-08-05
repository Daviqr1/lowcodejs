# Reorder Menu

Reordena multiplos itens de menu de uma vez.

## Endpoint
`PATCH /menu/reorder` | Auth: Yes | Permission: `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)`

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Validator: MenuReorderBodyValidator - campos: items (array de { _id: string min 1, order: number int min 0 })
3. UseCase:
   - Verifica se a lista de items nao esta vazia
   - Para cada item: busca o menu pelo _id (nao-trashed), verifica que existe
   - Valida que todos os items compartilham o mesmo parent
   - Para cada item: atualiza o order via menuRepository.update
   - Retorna null
4. Repository: MenuContractRepository (findBy, update)

## Regras de Negocio
- Todos os itens devem existir e estar ativos (nao-trashed)
- Todos os itens devem ter o mesmo parent (irmaos)
- O order de cada item e atualizado individualmente
- Retorna 200 com body null

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 400 | INVALID_PARAMETERS | Lista de items vazia ou items com parents diferentes |
| 404 | MENU_NOT_FOUND | Algum menu da lista nao encontrado ou esta na lixeira |
| 500 | REORDER_MENU_ERROR | Erro interno |

## Testes
- Unit: `reorder.use-case.spec.ts` (nao existe ainda)
- E2E: `reorder.controller.spec.ts` (nao existe ainda)
