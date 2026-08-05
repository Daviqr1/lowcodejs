# Delete Row

Exclui permanentemente um registro de uma tabela.

## Endpoint
`DELETE /tables/:slug/rows/:_id` | Auth: Sim | Permission: REMOVE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (REMOVE_ROW)
2. Validator: TableRowDeleteParamsValidator - campos: slug (string, trim), _id (string, trim)
3. UseCase:
   - Busca tabela por slug exato
   - Constroi modelo dinamico via buildTable
   - Exclui registro via findOneAndDelete
   - Retorna null em caso de sucesso
4. Repository: TableContractRepository.findBy, colecao dinamica via buildTable().findOneAndDelete

## Regras de Negocio
- Hard delete: exclui permanentemente o registro
- Nao ha verificacao de trashed antes do delete

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | ROW_NOT_FOUND | Registro nao encontrado |
| 500 | DELETE_ROW_ERROR | Erro interno |

## Testes
- Unit: `delete.use-case.spec.ts`
- E2E: `delete.controller.spec.ts`
