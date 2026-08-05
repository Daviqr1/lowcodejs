# Update Row

Atualiza um registro existente de uma tabela dinamica.

## Endpoint
`PUT /tables/:slug/rows/:_id` | Auth: Sim | Permission: UPDATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_ROW)
2. Validator: TableRowUpdateParamsValidator - campos: slug (string, trim), _id (string, trim). Body e Record<string, union(string, number, boolean, null, array)> - schema dinamico
3. UseCase:
   - Busca tabela por slug exato
   - Valida payload via validateRowPayload com skipMissing=true (permite update parcial)
   - Hash de campos PASSWORD via hashPasswordFields
   - Constroi modelo dinamico via buildTable
   - Constroi populate via buildPopulate
   - Busca registro por _id com populate
   - Faz merge do registro existente com payload via row.set().save()
   - Re-popula apos salvar
   - Mascara campos PASSWORD no retorno
   - Retorna registro atualizado
4. Repository: TableContractRepository.findBy, colecao dinamica via buildTable().findOne, row.set().save()

## Regras de Negocio
- Update parcial: campos nao enviados mantem valor atual (skipMissing=true na validacao)
- Campos PASSWORD sao hasheados antes de persistir e mascarados no retorno
- Merge usa spread do registro existente + payload

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 400 | INVALID_PAYLOAD_FORMAT | Validacao de campos falhou |
| 404 | ROW_NOT_FOUND | Registro nao encontrado |
| 500 | UPDATE_ROW_TABLE_ERROR | Erro interno |

## Testes
- Unit: `update.use-case.spec.ts`
- E2E: `update.controller.spec.ts`
