# Delete Group Row

Remove permanentemente um item (subdocumento) de um campo FIELD_GROUP de uma row.

## Endpoint
`DELETE /tables/:slug/rows/:rowId/groups/:groupSlug/:itemId` | Auth: Yes | Permission: REMOVE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio), TableAccessMiddleware (REMOVE_ROW)
2. Validator: GroupRowDeleteParamsValidator - campos: slug (string), rowId (string), groupSlug (string), itemId (string)
3. UseCase:
   - Busca tabela pelo slug (exact match)
   - Encontra o campo FIELD_GROUP correspondente ao groupSlug
   - Constroi a tabela dinamica via buildTable()
   - Busca a row pai pelo rowId
   - Encontra o subdocumento pelo itemId via `.id(itemId)`
   - Remove o subdocumento via subdoc.deleteOne()
   - Salva a row
   - Retorna null
4. Repository: TableContractRepository (findBy)

## Regras de Negocio
- Este e um HARD DELETE - o subdocumento e removido permanentemente
- Nao ha soft delete para itens de grupo
- Retorna 200 com body null em caso de sucesso

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | GROUP_NOT_FOUND | Grupo FIELD_GROUP nao encontrado |
| 404 | ROW_NOT_FOUND | Row pai nao encontrada |
| 404 | ITEM_NOT_FOUND | Subdocumento com o itemId nao encontrado |
| 500 | DELETE_GROUP_ROW_ERROR | Erro interno |

## Testes
- Unit: `delete.use-case.spec.ts` (nao existe ainda)
- E2E: `delete.controller.spec.ts` (nao existe ainda)
