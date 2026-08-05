# Bulk Restore Rows

Restaura multiplos registros da lixeira em uma unica operacao.

## Endpoint
`PATCH /tables/:slug/rows/bulk-restore` | Auth: Sim | Permission: UPDATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_ROW)
2. Validator: BulkRestoreParamsValidator - campos: slug (string, trim). BulkRestoreBodyValidator - campos: ids (array de strings, min 1)
3. UseCase:
   - Busca tabela por slug exato
   - Constroi modelo dinamico via buildTable
   - Executa updateMany com filtro { _id: { $in: ids }, trashed: true } e $set { trashed: false, trashedAt: null }
   - Retorna { modified: modifiedCount }
4. Repository: TableContractRepository.findBy, colecao dinamica via buildTable().updateMany

## Regras de Negocio
- Operacao em lote: restaura multiplos registros de uma vez
- Apenas registros com trashed=true sao afetados (ignora nao descartados)
- Retorna contagem de registros modificados

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 500 | BULK_RESTORE_ROWS_ERROR | Erro interno |

## Testes
- Unit: nao possui
- E2E: nao possui
