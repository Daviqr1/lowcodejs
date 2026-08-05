# Show Group Row

Exibe um item especifico (subdocumento) dentro de um campo FIELD_GROUP de uma row.

## Endpoint
`GET /tables/:slug/rows/:rowId/groups/:groupSlug/:itemId` | Auth: Yes | Permission: VIEW_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio), TableAccessMiddleware (VIEW_ROW)
2. Validator: GroupRowShowParamsValidator - campos: slug (string), rowId (string), groupSlug (string), itemId (string)
3. UseCase:
   - Busca tabela pelo slug (exact match)
   - Encontra o campo FIELD_GROUP correspondente ao groupSlug
   - Constroi a tabela dinamica via buildTable()
   - Constroi populacoes via buildPopulate()
   - Busca a row pai pelo rowId com populate
   - Mascareia campos de senha
   - Encontra o item pelo itemId no array do campo FIELD_GROUP
   - Retorna o item encontrado
4. Repository: TableContractRepository (findBy)

## Regras de Negocio
- Busca o item por _id dentro do array de subdocumentos
- Campos de senha sao mascarados no retorno

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | GROUP_NOT_FOUND | Grupo FIELD_GROUP nao encontrado |
| 404 | ROW_NOT_FOUND | Row pai nao encontrada |
| 404 | ITEM_NOT_FOUND | Item com o itemId nao encontrado no array |
| 500 | GET_GROUP_ROW_ERROR | Erro interno |

## Testes
- Unit: `show.use-case.spec.ts` (nao existe ainda)
- E2E: `show.controller.spec.ts` (nao existe ainda)
