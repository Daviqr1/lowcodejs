# Bulk Update Rows

Atualiza o mesmo conjunto de campos (`data`) em varios registros de uma vez.
Usado pela edicao em massa do frontend (ex.: alterar o status de N registros).

## Endpoint
`PATCH /tables/:slug/rows/bulk-update` | Auth: Sim | Permission: UPDATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_ROW)
2. Validator:
   - `BulkUpdateParamsValidator` - slug (string, trim)
   - `BulkUpdateBodyValidator` - ids (array de strings, min 1, max 200) + data
     (Record dinamico, reaproveita `TableRowUpdateBodyValidator`, refine nao-vazio)
3. UseCase:
   - Busca tabela por slug (404 TABLE_NOT_FOUND se nao existir)
   - Reutiliza `TableRowUpdateUseCase` (construido com os mesmos contratos),
     executando-o **uma vez por id, sequencialmente**, com objeto novo por
     iteracao (`{ ...data, slug, _id, __actorUserId }`)
   - Cada registro passa por validacao, hash de PASSWORD, script beforeSave e
     notificacao de mencoes (identico a uma edicao individual)
   - Best-effort: id que falha entra em `errors[id] = cause`, lote continua
   - Retorna `{ modified: number, errors?: Record<string,string> }`

## Regras de Negocio
- Update parcial por registro (skipMissing herdado do update unico)
- Registros `trashed` tambem sao atualizados (igual a edicao individual)
- Loop sequencial (sem Promise.all) para proteger a VM de scripts e a conexao de dados
- `max(200)` ids por requisicao

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 400 | INVALID_PAYLOAD_FORMAT | ids vazio / data vazio / formato invalido |
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 500 | BULK_UPDATE_ROWS_ERROR | Erro interno inesperado |

Falhas por registro (ROW_NOT_FOUND, INVALID_PAYLOAD_FORMAT) NAO sao erro de
lote: aparecem no mapa `errors` da resposta 200.

## Testes
- Unit: `bulk-update.use-case.spec.ts`
- E2E: `bulk-update.controller.spec.ts`
