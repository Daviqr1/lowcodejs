# Update Group Row

Atualiza um item (subdocumento) existente dentro de um campo FIELD_GROUP de uma row.

## Endpoint
`PATCH /tables/:slug/rows/:rowId/groups/:groupSlug/:itemId` | Auth: Yes | Permission: UPDATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio), TableAccessMiddleware (UPDATE_ROW)
2. Validator: GroupRowUpdateParamsValidator - campos: slug (string), rowId (string), groupSlug (string), itemId (string) | Body: record dinamico (string, number, boolean, null, arrays, objetos)
3. UseCase:
   - Busca tabela pelo slug (exact match)
   - Encontra o campo FIELD_GROUP e a configuracao do grupo
   - Valida o payload contra os campos do grupo via validateRowPayload() com skipMissing: true
   - Hash campos de senha via hashPasswordFields()
   - Constroi a tabela dinamica via buildTable()
   - Busca a row pai pelo rowId
   - Encontra o subdocumento pelo itemId via `.id(itemId)`
   - Atualiza o subdocumento com subdoc.set(itemData)
   - Salva a row e popula relacionamentos
   - Mascareia campos de senha
   - Retorna o item atualizado
4. Repository: TableContractRepository (findBy)

## Regras de Negocio
- Usa PATCH semantics: somente campos enviados sao atualizados (skipMissing: true na validacao)
- Campos de senha sao hashed antes de salvar
- O subdocumento e acessado via Mongoose `.id()` helper
- Retorna o item atualizado apos populate

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | GROUP_NOT_FOUND | Grupo FIELD_GROUP nao encontrado ou config inexistente |
| 404 | ROW_NOT_FOUND | Row pai nao encontrada |
| 404 | ITEM_NOT_FOUND | Subdocumento com o itemId nao encontrado |
| 400 | INVALID_PAYLOAD_FORMAT | Payload nao passa na validacao dos campos |
| 500 | UPDATE_GROUP_ROW_ERROR | Erro interno |

## Testes
- Unit: `update.use-case.spec.ts` (nao existe ainda)
- E2E: `update.controller.spec.ts` (nao existe ainda)
