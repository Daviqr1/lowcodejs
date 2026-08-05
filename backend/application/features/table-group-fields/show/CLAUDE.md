# Show Group Field

Exibe um campo especifico de um grupo dentro de uma tabela.

## Endpoint
`GET /tables/:slug/groups/:groupSlug/fields/:fieldId` | Auth: Yes | Permission: VIEW_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio), TableAccessMiddleware (VIEW_FIELD)
2. Validator: GroupFieldShowParamsValidator - campos: slug (string), groupSlug (string), fieldId (string)
3. UseCase:
   - Busca tabela pelo slug (exact match)
   - Encontra o grupo pelo groupSlug dentro de table.groups
   - Busca o campo pelo fieldId via fieldRepository.findBy
   - Retorna o campo encontrado
4. Repository: TableContractRepository (findBy), FieldContractRepository (findBy)

## Regras de Negocio
- Valida existencia da tabela, grupo e campo em sequencia
- Busca o campo diretamente pelo _id no repositorio de fields

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela com o slug informado nao existe |
| 404 | GROUP_NOT_FOUND | Grupo com o groupSlug nao existe na tabela |
| 404 | FIELD_NOT_FOUND | Campo com o fieldId nao existe |
| 500 | GET_GROUP_FIELD_ERROR | Erro interno durante busca |

## Testes
- Unit: `show.use-case.spec.ts` (nao existe ainda)
- E2E: `show.controller.spec.ts` (nao existe ainda)
