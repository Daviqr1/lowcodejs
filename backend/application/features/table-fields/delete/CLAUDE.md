# Delete Field

Exclui permanentemente um campo de uma tabela.

## Endpoint
`DELETE /tables/:slug/fields/:_id` | Auth: Sim | Permission: REMOVE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (REMOVE_FIELD)
2. Validator: TableFieldDeleteParamsValidator - campos: slug (string, trim), _id (string, trim). TableFieldDeleteQueryValidator - campos: group (string optional - slug do grupo)
3. UseCase:
   - Busca tabela por slug exato
   - Se query param group fornecido: delega para deleteFieldInGroup (exclui campo dentro de um grupo)
   - Busca campo por _id exato
   - Valida que campo esta na lixeira (trashed=true obrigatorio)
   - Valida que campo nao e nativo
   - Valida que campo nao e locked
   - Remove campo da lista de fields da tabela
   - Reconstroi _schema com campos remanescentes
   - Atualiza tabela
   - Exclui campo do repositorio
   - Para exclusao em grupo: remove campo do grupo, reconstroi schema do grupo e da tabela pai
4. Repository: TableContractRepository.findBy, TableContractRepository.update, FieldContractRepository.findBy, FieldContractRepository.delete

## Regras de Negocio
- Campo deve estar na lixeira antes de exclusao permanente
- Campos nativos nao podem ser excluidos permanentemente
- Campos locked nao podem ser excluidos permanentemente
- Suporta exclusao de campos dentro de grupos via query param group
- Schema e reconstruido apos exclusao

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | GROUP_NOT_FOUND | Grupo nao encontrado (quando group query param fornecido) |
| 404 | FIELD_NOT_FOUND | Campo nao encontrado |
| 409 | FIELD_NOT_TRASHED | Campo nao esta na lixeira |
| 403 | NATIVE_FIELD_CANNOT_BE_DELETED | Campo nativo |
| 403 | FIELD_LOCKED | Campo locked |
| 500 | DELETE_FIELD_ERROR | Erro interno |

## Testes
- Unit: nao possui
- E2E: nao possui
