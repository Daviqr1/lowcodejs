# Create Group Row

Cria um novo item (subdocumento) dentro de um campo FIELD_GROUP de uma row existente.

## Endpoint
`POST /tables/:slug/rows/:rowId/groups/:groupSlug` | Auth: Yes | Permission: CREATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio), TableAccessMiddleware (CREATE_ROW)
2. Validator: GroupRowCreateParamsValidator - campos: slug (string), rowId (string), groupSlug (string) | Body: record dinamico (string, number, boolean, null, arrays, objetos)
3. UseCase:
   - Busca tabela pelo slug (exact match)
   - Encontra o campo FIELD_GROUP correspondente ao groupSlug via table.fields
   - Encontra a configuracao do grupo em table.groups
   - Valida o payload contra os campos do grupo via validateRowPayload()
   - Hash campos de senha via hashPasswordFields()
   - Constroi a tabela dinamica via buildTable()
   - Busca a row pai pelo rowId
   - Remove _id, slug, rowId, groupSlug do payload
   - Push do novo item no array embedded da row
   - Salva a row e popula relacionamentos
   - Mascareia campos de senha
   - Retorna o ultimo item adicionado ao array
4. Repository: TableContractRepository (findBy)

## Regras de Negocio
- O body e um record dinamico validado contra o schema do grupo
- Campos obrigatorios do grupo sao validados
- Campos de senha sao hashed antes de salvar
- O Mongoose gera um novo _id para o subdocumento automaticamente
- Retorna o item recem-adicionado (ultimo do array)

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | GROUP_NOT_FOUND | Grupo FIELD_GROUP nao encontrado ou config do grupo inexistente |
| 404 | ROW_NOT_FOUND | Row pai nao encontrada |
| 400 | INVALID_PAYLOAD_FORMAT | Payload nao passa na validacao dos campos do grupo |
| 500 | CREATE_GROUP_ROW_ERROR | Erro interno |

## Testes
- Unit: `create.use-case.spec.ts` (nao existe ainda)
- E2E: `create.controller.spec.ts` (nao existe ainda)
