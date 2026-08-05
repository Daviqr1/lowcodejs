# Send Table to Trash

Envia uma tabela para a lixeira (soft delete).

## Endpoint
`PATCH /tables/:slug/trash` | Auth: Sim | Permission: UPDATE_TABLE

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_TABLE)
2. Validator: TableSendToTrashParamsValidator - campos: slug (string, trim)
3. UseCase:
   - Busca tabela por slug exato
   - Verifica se ja esta na lixeira
   - Atualiza trashed=true e trashedAt=new Date()
   - Retorna tabela atualizada
4. Repository: TableContractRepository.findBy, TableContractRepository.update

## Regras de Negocio
- Soft delete: apenas marca como trashed, nao exclui dados
- Tabela ja na lixeira gera conflito 409

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 409 | ALREADY_TRASHED | Tabela ja esta na lixeira |
| 500 | SEND_TABLE_TO_TRASH_ERROR | Erro interno |

## Testes
- Unit: `send-to-trash.use-case.spec.ts`
- E2E: `send-to-trash.controller.spec.ts`
