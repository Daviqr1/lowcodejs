# Show Table

Retorna uma tabela pelo slug.

## Endpoint
`GET /tables/:slug` | Auth: Opcional | Permission: VIEW_TABLE

## Fluxo
1. Middleware: AuthenticationMiddleware (optional), TableAccessMiddleware (VIEW_TABLE)
2. Validator: TableShowParamsValidator - campos: slug (string, trim)
3. UseCase:
   - Busca tabela por slug exato
   - Se nao encontrada, retorna 404
   - Retorna tabela completa
4. Repository: TableContractRepository.findBy

## Regras de Negocio
- Auth opcional permite acesso a tabelas PUBLIC sem autenticacao
- Acesso controlado pelo TableAccessMiddleware baseado em visibilidade e permissoes

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Slug nao encontrado |
| 500 | GET_TABLE_BY_SLUG_ERROR | Erro interno |

## Testes
- Unit: `show.use-case.spec.ts`
- E2E: `show.controller.spec.ts`
