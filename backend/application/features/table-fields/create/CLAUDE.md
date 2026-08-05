# Create Field

Cria um novo campo em uma tabela existente.

## Endpoint
`POST /tables/:slug/fields` | Auth: Sim | Permission: CREATE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (CREATE_FIELD)
2. Validator: TableFieldCreateBodyValidator - campos: name (string, trim), type (E_FIELD_TYPE enum) + TableFieldBaseSchema (required, multiple, format, permissions ({list,form,detail} → binding), showInFilter (sidebar de filtros), widthInForm, widthInList, widthInDetail, locked, defaultValue, relationship, dropdown, category, group). TableFieldCreateParamsValidator - campos: slug (string, trim)
3. UseCase:
   - Busca tabela por slug exato
   - Gera slug do campo via slugify
   - Verifica se campo com mesmo slug ja existe na tabela
   - Cria campo no repositorio (group forcado como null)
   - Se tipo FIELD_GROUP: cria campos nativos do grupo (FIELD_GROUP_NATIVE_LIST), gera schema do grupo, adiciona grupo em groups da tabela, atualiza campo com referencia ao grupo
   - Adiciona campo a lista de fields da tabela
   - Reconstroi _schema via buildSchema
   - Atualiza tabela com novos fields, _schema, groups, fieldOrderList e fieldOrderForm
   - Reconstroi tabela dinamica via buildTable
   - Retorna campo criado
4. Repository: TableContractRepository.findBy, TableContractRepository.update, FieldContractRepository.create, FieldContractRepository.createMany, FieldContractRepository.update

## Regras de Negocio
- Slug do campo deve ser unico na tabela
- Campos FIELD_GROUP criam automaticamente sub-campos nativos e entrada em groups
- Campo e adicionado automaticamente no final de fieldOrderList e fieldOrderForm
- Schema da tabela e reconstruido apos adicao

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 409 | FIELD_ALREADY_EXIST | Campo com mesmo slug ja existe |
| 500 | CREATE_FIELD_ERROR | Erro interno |

## Testes
- Unit: `create.use-case.spec.ts`
- E2E: `create.controller.spec.ts`
