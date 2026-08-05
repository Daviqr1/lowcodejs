# Paginated Tables

Lista tabelas com paginacao, filtros e ordenacao.

## Endpoint
`GET /tables/paginated` | Auth: Sim | Permission: -

## Fluxo
1. Middleware: AuthenticationMiddleware (required)
2. Validator: TablePaginatedQueryValidator - campos: page (number default 1), perPage (number default 50), search (string optional), name (string optional), trashed (string optional), owner (string optional), order-name (asc/desc optional), order-link (asc/desc optional), order-created-at (asc/desc optional), order-owner (asc/desc optional)
3. UseCase:
   - Converte trashed para boolean
   - Monta objeto sort a partir dos campos order-*
   - Busca tabelas via findMany com filtros (type TABLE, paginacao, search, trashed, owner, sort)
   - Conta total de registros via count com mesmos filtros
   - Calcula metadados de paginacao (total, perPage, page, lastPage, firstPage)
   - Retorna Paginated<ITable> com data e meta
4. Repository: TableContractRepository.findMany, TableContractRepository.count

## Regras de Negocio
- Sem TableAccessMiddleware pois nao opera em tabela especifica
- Filtra apenas tabelas do tipo TABLE (exclui FIELD_GROUP)
- Search e name sao intercambiaveis (search tem prioridade)
- Ordenacao suporta: name, slug, createdAt, owner.name

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 500 | TABLE_LIST_PAGINATED_ERROR | Erro interno |

## Testes
- Unit: `paginated.use-case.spec.ts`
- E2E: `paginated.controller.spec.ts`
