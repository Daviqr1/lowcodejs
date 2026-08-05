# Create Group Field

Cria um novo campo dentro de um grupo (FIELD_GROUP) de uma tabela.

## Endpoint
`POST /tables/:slug/groups/:groupSlug/fields` | Auth: Yes | Permission: CREATE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio), TableAccessMiddleware (CREATE_FIELD)
2. Validator: GroupFieldCreateBodyValidator - campos: name (string, required), type (enum E_FIELD_TYPE, required) + TableFieldBaseSchema (required, multiple, `permissions` { list, form, detail } → binding, showInFilter, widthInForm, widthInList, widthInDetail, locked, format, defaultValue, dropdown, relationship, category) | GroupFieldCreateParamsValidator - campos: slug (string), groupSlug (string)
3. UseCase:
   - Busca tabela pelo slug (exact match)
   - Encontra o grupo pelo groupSlug dentro de table.groups
   - Gera slug do campo via slugify(name)
   - Verifica duplicidade de slug dentro do grupo
   - Cria o campo via fieldRepository.create (group: null)
   - Atualiza o grupo adicionando o campo e reconstruindo _schema do grupo via buildSchema()
   - Reconstroi o _schema da tabela pai via buildSchema(fields, updatedGroups)
   - Atualiza a tabela via tableRepository.update
   - Reconstroi a tabela dinamica via buildTable()
4. Repository: TableContractRepository (findBy, update), FieldContractRepository (create)

## Regras de Negocio
- O slug do campo e gerado automaticamente a partir do nome
- Se ja existir um campo com o mesmo slug no grupo, retorna 409
- O campo e criado com group: null no repositorio de fields
- Apos criacao, o schema do grupo e da tabela pai sao reconstruidos

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela com o slug informado nao existe |
| 404 | GROUP_NOT_FOUND | Grupo com o groupSlug nao existe na tabela |
| 409 | FIELD_ALREADY_EXIST | Ja existe campo com o mesmo slug no grupo |
| 500 | CREATE_GROUP_FIELD_ERROR | Erro interno durante criacao |

## Testes
- Unit: `create.use-case.spec.ts` (nao existe ainda)
- E2E: `create.controller.spec.ts` (nao existe ainda)
