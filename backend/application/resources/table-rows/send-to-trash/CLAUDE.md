# Send Row to Trash

Envia um registro para a lixeira (soft delete).

## Endpoint
`PATCH /tables/:slug/rows/:_id/trash` | Auth: Sim | Permission: UPDATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_ROW)
2. Validator: TableRowSendToTrashParamsValidator - campos: slug (string, trim), _id (string, trim)
3. UseCase:
   - Busca tabela por slug exato
   - Constroi modelo dinamico via buildTable
   - Constroi populate via buildPopulate
   - Busca registro por _id via findOne
   - Verifica se ja esta na lixeira
   - Atualiza trashedAt=new Date() via update
   - Popula o registro
   - Retorna registro atualizado com _id como string
4. Repository: TableContractRepository.findBy, colecao dinamica via buildTable().findOne, row.set().save()

## Regras de Negocio
- Soft delete: marca como trashed sem excluir dados
- Registro ja na lixeira gera conflito 409

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | ROW_NOT_FOUND | Registro nao encontrado |
| 409 | ALREADY_TRASHED | Registro ja esta na lixeira |
| 500 | SEND_ROW_TABLE_TO_TRASH_ERROR | Erro interno |

## Testes
- Unit: `send-to-trash.use-case.spec.ts`
- E2E: `send-to-trash.controller.spec.ts`
