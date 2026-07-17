# Remove Row from Trash

Restaura um registro da lixeira.

## Endpoint
`PATCH /tables/:slug/rows/:_id/restore` | Auth: Sim | Permission: UPDATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_ROW)
2. Validator: TableRowRemoveFromTrashParamsValidator - campos: slug (string, trim), _id (string, trim)
3. UseCase:
   - Busca tabela por slug exato
   - Constroi modelo dinamico via buildTable
   - Constroi populate via buildPopulate
   - Busca registro por _id via findOne
   - Verifica se esta na lixeira (trashedAt deve estar preenchido)
   - Atualiza trashedAt=null via update
   - Popula o registro
   - Retorna registro atualizado com _id como string
4. Repository: TableContractRepository.findBy, colecao dinamica via buildTable().findOne, row.set().save()

## Regras de Negocio
- Restaura registro removendo marcacao de trashed
- Registro que nao esta na lixeira gera conflito 409

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | ROW_NOT_FOUND | Registro nao encontrado |
| 409 | NOT_TRASHED | Registro nao esta na lixeira |
| 500 | REMOVE_ROW_FROM_TRASH_ERROR | Erro interno |

## Testes
- Unit: `remove-from-trash.use-case.spec.ts`
- E2E: `remove-from-trash.controller.spec.ts`
