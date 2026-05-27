# Bulk Trash Rows

Envia multiplos registros para a lixeira em uma unica operacao, respeitando
row-access guards ativos na tabela (`row-access` — consolida visibility,
creator bypass e janela temporal num plugin único).

## Endpoint
`PATCH /tables/:slug/rows/bulk-trash` | Auth: Sim | Permission: UPDATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_ROW)
2. Validator: BulkTrashParamsValidator (slug) + BulkTrashBodyValidator (ids: string[] min 1)
3. UseCase:
   - Busca tabela por slug exato
   - Para cada `rowId` no batch:
     - Carrega a row via `rowRepository.findOne`
     - Se `null` → adiciona em `skipped` com `reason: 'NOT_FOUND'`
     - Aplica `guardService.composeReadDecision` — se `false`, `skipped` com `reason: 'ROW_ACCESS_DENIED'`
     - Aplica `guardService.composeWriteDecision('delete')` — se `deny`, `skipped` com `reason` do guard (ex: `ROW_WRITE_RESTRICTED`)
     - Senao, agrega em `survivors[]`
   - `rowRepository.bulkTrash({ table, ids: survivors })` (ou skip se vazio)
   - Retorna `{ deleted: number, skipped: SkippedRow[] }`
4. Repository: `RowContractRepository.findOne` + `RowContractRepository.bulkTrash`

## Regras de Negocio
- Operacao em lote: atualiza multiplos registros de uma vez
- Apenas registros com `trashed=false` sao afetados (filtro feito no `bulkTrash` do repository)
- Cada row passa por **leitura (canRead)** e **escrita-delete (canWrite)** dos guards ativos antes de ser incluida no batch — rows bloqueadas sao reportadas em `skipped`
- Admin bypass (MASTER/ADMINISTRATOR) pula todos os guards via `RowAccessGuardService.bypassAdmin`

## Resposta de Sucesso
```json
{
  "deleted": 3,
  "skipped": [
    { "rowId": "65a...", "reason": "ROW_ACCESS_DENIED" },
    { "rowId": "65b...", "reason": "NOT_FOUND" }
  ]
}
```

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 500 | BULK_TRASH_ROWS_ERROR | Erro interno |

## Testes
- Unit: `bulk-trash.use-case.spec.ts` (inclui cenarios de guard bloqueando parte do batch)
- E2E: nao possui
