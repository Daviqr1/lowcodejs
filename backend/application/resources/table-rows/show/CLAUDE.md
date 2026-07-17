# Show Row

Retorna um registro especifico de uma tabela pelo ID.

## Endpoint
`GET /tables/:slug/rows/:_id` | Auth: Opcional | Permission: VIEW_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (optional), TableAccessMiddleware (VIEW_ROW)
2. Validator: TableRowShowParamsValidator - campos: slug (string, trim), _id (string, trim)
3. UseCase:
   - Busca tabela por slug exato
   - Constroi modelo dinamico via buildTable
   - Constroi populate via buildPopulate
   - Busca registro por _id via findOne
   - Popula o registro
   - Mascara campos PASSWORD no retorno
   - Retorna registro com _id como string
4. Repository: TableContractRepository.findBy, colecao dinamica via buildTable().findOne

## Regras de Negocio
- Auth opcional permite visualizacao quando o binding de VIEW_ROW (`table.permissions`) e PUBLIC
- Campos PASSWORD sao mascarados no retorno

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | ROW_NOT_FOUND | Registro nao encontrado |
| 500 | GET_ROW_TABLE_BY_ID_ERROR | Erro interno |

## Testes
- Unit: `show.use-case.spec.ts`
- E2E: `show.controller.spec.ts`
