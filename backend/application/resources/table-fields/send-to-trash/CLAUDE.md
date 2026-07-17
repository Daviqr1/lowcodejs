# Send Field to Trash

Envia um campo para a lixeira (soft delete), desabilitando visibilidade.

## Endpoint
`PATCH /tables/:slug/fields/:_id/trash` | Auth: Sim | Permission: UPDATE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_FIELD)
2. Validator: TableFieldSendToTrashParamsValidator - campos: slug (string, trim), _id (string, trim)
3. UseCase:
   - Busca tabela por slug exato
   - Busca campo por _id exato
   - Valida que campo nao e nativo
   - Valida que campo nao e locked
   - Valida que campo nao esta ja na lixeira
   - Atualiza campo: `permissions=buildFieldPermissions(false,false,false)` (oculta em list/form/detail), showInFilter=false, required=false, trashed=true, trashedAt=new Date()
   - Reconstroi lista de fields e _schema da tabela
   - Atualiza tabela
   - Retorna campo atualizado
4. Repository: TableContractRepository.findBy, TableContractRepository.update, FieldContractRepository.findBy, FieldContractRepository.update

## Regras de Negocio
- Campos nativos nao podem ser enviados pra lixeira
- Campos locked nao podem ser enviados pra lixeira
- Ao enviar pra lixeira, todas as flags de visibilidade sao desabilitadas e required vira false
- Schema da tabela e reconstruido

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | FIELD_NOT_FOUND | Campo nao encontrado |
| 403 | NATIVE_FIELD_CANNOT_BE_TRASHED | Campo nativo |
| 403 | FIELD_LOCKED | Campo locked |
| 409 | ALREADY_TRASHED | Campo ja esta na lixeira |
| 500 | SEND_FIELD_TO_TRASH_ERROR | Erro interno |

## Testes
- Unit: `send-to-trash.use-case.spec.ts`
- E2E: `send-to-trash.controller.spec.ts`
