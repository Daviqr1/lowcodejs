# Delete Category

Remove um no (categoria) e seus descendentes da arvore de categorias de um campo
do tipo CATEGORY e desvincula esse no dos registros (rows) que o referenciam.

## Endpoint
`DELETE /tables/:slug/fields/:_id/category/:categoryId` | Auth: Sim | Permission: UPDATE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_FIELD)
2. Validator: TableFieldDeleteCategoryParamsValidator - campos: slug (string, trim), _id (string, trim), categoryId (string, trim, min 1)
3. UseCase:
   - Busca tabela por slug exato
   - Busca campo por _id exato
   - Valida que campo pertence a tabela
   - Valida que campo e do tipo CATEGORY
   - Remove recursivamente o no por id (funcao removeCategoryNode); coleta removedIds = id do no + todos os descendentes (collectIds)
   - Se nenhum no foi removido: CATEGORY_NOT_FOUND
   - Atualiza campo com nova arvore (sem o no)
   - Desvincula registros: RowContractRepository.pullCategoryValues(table, field.slug, removedIds) - faz $pull dos ids no array do campo de cada row
   - Retorna { field atualizado, removedIds }
4. Repository: TableContractRepository.findBySlug, FieldContractRepository.findById/update, RowContractRepository.pullCategoryValues

## Regras de Negocio
- Campo deve ser do tipo CATEGORY e pertencer a tabela referenciada
- Exclusao e cascateada: remove o no e todas as subsecoes
- Registros (artigos) vinculados NAO sao apagados; apenas perdem a referencia (vao para "sem categoria")

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | FIELD_NOT_FOUND | Campo nao encontrado ou nao pertence a tabela |
| 400 | INVALID_FIELD_TYPE | Campo nao e do tipo CATEGORY |
| 404 | CATEGORY_NOT_FOUND | categoryId nao encontrado na arvore |
| 500 | DELETE_CATEGORY_OPTION_ERROR | Erro interno |

## Testes
- Unit: delete-category.use-case.spec.ts
- E2E: delete-category.controller.spec.ts
