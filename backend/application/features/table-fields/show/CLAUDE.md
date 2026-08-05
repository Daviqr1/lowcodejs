# Show Field

Retorna um campo especifico de uma tabela pelo ID.

## Endpoint
`GET /tables/:slug/fields/:_id` | Auth: Sim | Permission: VIEW_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (VIEW_FIELD)
2. Validator: TableFieldShowParamsValidator - campos: slug (string, trim - referencia da tabela), _id (string, trim)
3. UseCase:
   - Busca tabela por slug exato
   - Busca campo por _id exato
   - Retorna campo encontrado
4. Repository: TableContractRepository.findBy, FieldContractRepository.findBy

## Regras de Negocio
- Tabela deve existir (validacao de contexto)
- Campo deve existir

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | FIELD_NOT_FOUND | Campo nao encontrado |
| 500 | GET_FIELD_BY_ID_ERROR | Erro interno |

## Testes
- Unit: `show.use-case.spec.ts`
- E2E: `show.controller.spec.ts`
