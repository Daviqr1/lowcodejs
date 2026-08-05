# Bulk Trash Rows

Envia multiplos registros para a lixeira em uma unica operacao.

## Endpoint
`PATCH /tables/:slug/rows/bulk-trash` | Auth: Sim | Permission: UPDATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_ROW)
2. Validator: BulkTrashParamsValidator - campos: slug (string, trim). BulkTrashBodyValidator - campos: ids (array de strings, min 1)
3. UseCase:
   - Busca tabela por slug exato
   - Constroi modelo dinamico via buildTable
   - Executa updateMany com filtro { _id: { $in: ids }, trashed: false } e $set { trashed: true, trashedAt: new Date() }
   - Retorna { modified: modifiedCount }
4. Repository: TableContractRepository.findBy, colecao dinamica via buildTable().updateMany

## Regras de Negocio
- Operacao em lote: atualiza multiplos registros de uma vez
- Apenas registros com trashed=false sao afetados (ignora ja descartados)
- Retorna contagem de registros modificados

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 500 | BULK_TRASH_ROWS_ERROR | Erro interno |

## Testes
- Unit: nao possui
- E2E: nao possui
