# List Group Rows

Lista todos os itens (subdocumentos) de um campo FIELD_GROUP dentro de uma row.

## Endpoint
`GET /tables/:slug/rows/:rowId/groups/:groupSlug` | Auth: Yes | Permission: VIEW_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio), TableAccessMiddleware (VIEW_ROW)
2. Validator: GroupRowListParamsValidator - campos: slug (string), rowId (string), groupSlug (string)
3. UseCase:
   - Busca tabela pelo slug (exact match)
   - Encontra o campo FIELD_GROUP correspondente ao groupSlug
   - Constroi a tabela dinamica via buildTable()
   - Constroi populacoes via buildPopulate()
   - Busca a row pai pelo rowId com populate
   - Mascareia campos de senha
   - Retorna o array de itens do campo FIELD_GROUP (ou array vazio)
4. Repository: TableContractRepository (findBy)

## Regras de Negocio
- Retorna todos os subdocumentos do array do campo FIELD_GROUP
- Campos de senha sao mascarados no retorno
- Relacionamentos sao populados automaticamente

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | GROUP_NOT_FOUND | Grupo FIELD_GROUP nao encontrado |
| 404 | ROW_NOT_FOUND | Row pai nao encontrada |
| 500 | LIST_GROUP_ROWS_ERROR | Erro interno |

## Testes
- Unit: `list.use-case.spec.ts` (nao existe ainda)
- E2E: `list.controller.spec.ts` (nao existe ainda)
