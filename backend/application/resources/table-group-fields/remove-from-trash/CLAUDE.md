# Remove Group Field from Trash

Restaura um campo de grupo da lixeira, reabilitando visibilidade.

## Endpoint
`PATCH /tables/:slug/groups/:groupSlug/fields/:fieldId/restore` | Auth: Yes | Permission: UPDATE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio), TableAccessMiddleware (UPDATE_FIELD)
2. Validator: GroupFieldRemoveFromTrashParamsValidator - campos: slug (string), groupSlug (string), fieldId (string)
3. UseCase:
   - Busca tabela pelo slug (exact match)
   - Encontra o grupo pelo groupSlug
   - Busca o campo pelo fieldId
   - Valida que campo esta na lixeira (trashed=true)
   - Atualiza campo: `permissions=buildFieldPermissions(true,true,true)` (visivel em list/form/detail), showInFilter=true, required=false, trashed=false, trashedAt=null
   - Atualiza o grupo com o campo atualizado e reconstroi schema do grupo
   - Reconstroi o schema da tabela pai
   - Atualiza a tabela
4. Repository: TableContractRepository (findBy, update), FieldContractRepository (findBy, update)

## Regras de Negocio
- Campo deve estar na lixeira para ser restaurado
- Ao restaurar, todas as flags de visibilidade sao reabilitadas (true)
- required permanece false apos restauracao
- Schema do grupo e da tabela pai sao reconstruidos

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | GROUP_NOT_FOUND | Grupo nao encontrado na tabela |
| 404 | FIELD_NOT_FOUND | Campo nao encontrado |
| 409 | NOT_TRASHED | Campo nao esta na lixeira |
| 500 | REMOVE_GROUP_FIELD_FROM_TRASH_ERROR | Erro interno |

## Testes
- Unit: `remove-from-trash.use-case.spec.ts` (nao existe ainda)
- E2E: `remove-from-trash.controller.spec.ts` (nao existe ainda)
