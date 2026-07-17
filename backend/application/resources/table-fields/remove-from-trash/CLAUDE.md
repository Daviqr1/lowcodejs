# Remove Field from Trash

Restaura um campo da lixeira, reabilitando visibilidade.

## Endpoint
`PATCH /tables/:slug/fields/:_id/restore` | Auth: Sim | Permission: UPDATE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_FIELD)
2. Validator: TableFieldRemoveFromTrashParamsValidator - campos: slug (string, trim), _id (string, trim)
3. UseCase:
   - Busca tabela por slug exato
   - Busca campo por _id exato
   - Valida que campo esta na lixeira (trashed=true)
   - Atualiza campo: `permissions=buildFieldPermissions(true,true,true)` (visivel em list/form/detail), showInFilter=true, required=false, trashed=false, trashedAt=null
   - Reconstroi lista de fields e _schema da tabela
   - Atualiza tabela
   - Retorna campo atualizado
4. Repository: TableContractRepository.findBy, TableContractRepository.update, FieldContractRepository.findBy, FieldContractRepository.update

## Regras de Negocio
- Campo deve estar na lixeira para ser restaurado
- Ao restaurar, todas as flags de visibilidade sao reabilitadas (true)
- required permanece false apos restauracao
- Schema da tabela e reconstruido

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | FIELD_NOT_FOUND | Campo nao encontrado |
| 409 | NOT_TRASHED | Campo nao esta na lixeira |
| 500 | REMOVE_FIELD_FROM_TRASH_ERROR | Erro interno |

## Testes
- Unit: `remove-from-trash.use-case.spec.ts`
- E2E: `remove-from-trash.controller.spec.ts`
