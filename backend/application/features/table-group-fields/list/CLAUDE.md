# List Group Fields

Lista todos os campos de um grupo especifico dentro de uma tabela.

## Endpoint
`GET /tables/:slug/groups/:groupSlug/fields` | Auth: Yes | Permission: VIEW_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio), TableAccessMiddleware (VIEW_FIELD)
2. Validator: GroupFieldListParamsValidator - campos: slug (string), groupSlug (string)
3. UseCase:
   - Busca tabela pelo slug (exact match)
   - Encontra o grupo pelo groupSlug dentro de table.groups
   - Retorna targetGroup.fields (ou array vazio)
4. Repository: TableContractRepository (findBy)

## Regras de Negocio
- Retorna todos os campos do grupo, incluindo nativos
- Se o grupo nao tem campos, retorna array vazio

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela com o slug informado nao existe |
| 404 | GROUP_NOT_FOUND | Grupo com o groupSlug nao existe na tabela |
| 500 | LIST_GROUP_FIELDS_ERROR | Erro interno durante listagem |

## Testes
- Unit: `list.use-case.spec.ts` (nao existe ainda)
- E2E: `list.controller.spec.ts` (nao existe ainda)
