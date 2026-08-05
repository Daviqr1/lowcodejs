# Send Group Field to Trash

Envia um campo de grupo para a lixeira (soft delete).

## Endpoint
`POST /tables/:slug/groups/:groupSlug/fields/:fieldId/send-to-trash` | Auth: Yes | Permission: UPDATE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio), TableAccessMiddleware (UPDATE_FIELD)
2. Validator: GroupFieldSendToTrashParamsValidator - campos: slug (string), groupSlug (string), fieldId (string)
3. UseCase:
   - Busca tabela pelo slug (exact match)
   - Encontra o grupo pelo groupSlug
   - Busca o campo pelo fieldId
   - Verifica se o campo e nativo (nao pode ser enviado para lixeira)
   - Verifica se o campo e locked (nao pode ser enviado para lixeira)
   - Verifica se o campo ja esta na lixeira
   - Atualiza o campo: `permissions=buildFieldPermissions(false,false,false)` (oculta em list/form/detail), showInFilter=false, required=false, trashed=true, trashedAt=now
   - Atualiza o grupo com o campo atualizado e reconstroi schema do grupo
   - Reconstroi o schema da tabela pai
   - Atualiza a tabela
4. Repository: TableContractRepository (findBy, update), FieldContractRepository (findBy, update)

## Regras de Negocio
- Campos nativos NAO podem ser enviados para lixeira
- Campos locked NAO podem ser enviados para lixeira
- Se o campo ja esta na lixeira, retorna 409
- Ao enviar para lixeira, todas as flags de visibilidade sao desativadas e required vira false
- A data de trashedAt e definida automaticamente como a data atual
- NAO reconstroi a tabela dinamica (diferente de create/update)

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | GROUP_NOT_FOUND | Grupo nao encontrado na tabela |
| 404 | FIELD_NOT_FOUND | Campo nao encontrado |
| 403 | NATIVE_FIELD_CANNOT_BE_TRASHED | Tentativa de enviar campo nativo para lixeira |
| 403 | FIELD_LOCKED | Tentativa de enviar campo locked para lixeira |
| 409 | ALREADY_TRASHED | Campo ja esta na lixeira |
| 500 | SEND_GROUP_FIELD_TO_TRASH_ERROR | Erro interno |

## Testes
- Unit: `send-to-trash.use-case.spec.ts` (nao existe ainda)
- E2E: `send-to-trash.controller.spec.ts` (nao existe ainda)
