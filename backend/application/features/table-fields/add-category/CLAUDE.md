# Add Category

Adiciona um novo no (categoria) a arvore de categorias de um campo do tipo CATEGORY.

## Endpoint
`POST /tables/:slug/fields/:_id/category` | Auth: Sim | Permission: UPDATE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_FIELD)
2. Validator: TableFieldAddCategoryParamsValidator - campos: slug (string, trim), _id (string, trim). TableFieldAddCategoryBodyValidator - campos: label (string, trim, min 1), parentId (string nullable optional)
3. UseCase:
   - Busca tabela por slug exato
   - Busca campo por _id exato
   - Valida que campo pertence a tabela
   - Valida que campo e do tipo CATEGORY
   - Cria novo no com id=randomUUID(), label e children=[]
   - Se parentId=null: adiciona no na raiz da arvore
   - Se parentId fornecido: busca recursivamente o pai na arvore e insere como filho (funcao addCategoryNode)
   - Atualiza campo com nova arvore de categorias
   - Retorna objeto com node (id, label, parentId) e field atualizado
4. Repository: TableContractRepository.findBy, FieldContractRepository.findBy, FieldContractRepository.update

## Regras de Negocio
- Campo deve ser do tipo CATEGORY
- Campo deve pertencer a tabela referenciada
- Suporta arvore hierarquica de categorias (nos aninhados)
- parentId null insere na raiz, parentId com valor insere como filho recursivamente
- ID do no e gerado via randomUUID

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | FIELD_NOT_FOUND | Campo nao encontrado ou nao pertence a tabela |
| 400 | INVALID_FIELD_TYPE | Campo nao e do tipo CATEGORY |
| 404 | PARENT_CATEGORY_NOT_FOUND | parentId fornecido mas nao encontrado na arvore |
| 500 | ADD_CATEGORY_OPTION_ERROR | Erro interno |

## Testes
- Unit: nao possui
- E2E: nao possui
