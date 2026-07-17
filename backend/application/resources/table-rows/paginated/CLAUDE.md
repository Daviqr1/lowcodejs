# Paginated Rows

Lista registros de uma tabela com paginacao, filtros dinamicos e ordenacao.

## Endpoint
`GET /tables/:slug/rows/paginated` | Auth: Opcional | Permission: VIEW_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (optional), TableAccessMiddleware (VIEW_ROW)
2. Validator: TableRowPaginatedQueryValidator - campos: page (number default 1), perPage (number default 50), search (string optional) + campos dinamicos (.loose()). TableRowPaginatedParamsValidator - campos: slug (string, trim)
3. UseCase:
   - Calcula skip a partir de page e perPage
   - Busca tabela por slug exato
   - Constroi modelo dinamico via buildTable
   - Constroi query de filtro via buildQuery (filtros dinamicos baseados nos campos da tabela)
   - Constroi ordenacao via buildOrder (usa table.order como default)
   - Constroi populate via buildPopulate
   - Executa find com query, populate, skip, limit e sort
   - Conta total com countDocuments
   - Mascara campos PASSWORD em cada registro
   - Retorna Paginated<IRow> com data e meta
4. Repository: TableContractRepository.findBy, colecao dinamica via buildTable().find, buildTable().countDocuments

## Regras de Negocio
- Auth opcional permite listagem quando o binding de VIEW_ROW (`table.permissions`) e PUBLIC
- Filtros sao dinamicos: query params alem de page/perPage/search sao tratados como filtros de campos
- buildQuery converte filtros para query MongoDB baseado nos tipos dos campos
- buildOrder usa ordenacao padrao da tabela se nenhuma especificada
- Campos PASSWORD sao mascarados no retorno

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 500 | LIST_ROW_TABLE_PAGINATED_ERROR | Erro interno |

## Testes
- Unit: `paginated.use-case.spec.ts`
- E2E: `paginated.controller.spec.ts`
