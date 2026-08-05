# Delete Table

Exclui permanentemente uma tabela, seus campos e a colecao dinamica.

## Endpoint
`DELETE /tables/:slug` | Auth: Sim | Permission: REMOVE_TABLE

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (REMOVE_TABLE)
2. Validator: TableDeleteParamsValidator - campos: slug (string, trim)
3. UseCase:
   - Busca tabela por slug exato
   - Exclui todos os campos associados via deleteMany
   - Dropa a colecao dinamica (registros da tabela) via dropCollection
   - Exclui o documento da tabela
4. Repository: TableContractRepository.findBy, TableContractRepository.dropCollection, TableContractRepository.delete, FieldContractRepository.deleteMany

## Regras de Negocio
- Hard delete: exclui permanentemente a tabela, campos e todos os registros
- Dropa a colecao MongoDB inteira da tabela
- Nao ha verificacao de trashed antes do delete

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 500 | DELETE_TABLE_ERROR | Erro interno |

## Testes
- Unit: `delete.use-case.spec.ts`
- E2E: `delete.controller.spec.ts`
