# Update Table

Atualiza uma tabela existente, incluindo nome, estilo, permissoes (binding por
acao), membros (convidados), dono e layout.

## Endpoint
`PUT /tables/:slug` | Auth: Sim | Permission: UPDATE_TABLE

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_TABLE)
2. Validator: TableUpdateBodyValidator - campos: name (string, trim, min 1, max 40, regex), description (string nullable), logo (string nullable), style (TableStyleSchema), permissions (TablePermissionsSchema optional, mapa acao→binding), members (TableMembersSchema optional, `{ user, profile }`), owner (string optional, troca de dono), fieldOrderList/Form/Filter/Detail (array string), methods (TableMethodSchema), order (TableOrderSchema), layoutFields (TableLayoutFieldsSchema optional), groups, rowSlugFieldId. TableUpdateParamsValidator - campos: slug (string, trim)
3. UseCase:
   - Busca tabela por slug exato
   - Gera novo slug via slugify a partir do novo nome
   - Se slug mudou, verifica unicidade do novo slug
   - Se slug mudou, renomeia colecao e atualiza referencias em campos RELATIONSHIP
   - Atualiza documento da tabela com todos os campos (`permissions`/`members`/`owner` quando enviados)
   - Reconstroi tabela dinamica via buildTable
   - Se slug mudou, reconstroi tabelas que tem RELATIONSHIP apontando para esta
4. Repository: TableContractRepository.findBy, TableContractRepository.update, TableContractRepository.renameSlug, TableContractRepository.updateMany, TableContractRepository.findByFieldIds, FieldContractRepository.updateRelationshipTableSlug, FieldContractRepository.findMany, FieldContractRepository.findByRelationshipTableId, UserContractRepository.findMany

## Regras de Negocio
- Nome gera novo slug automaticamente
- `permissions`, `members` e `owner` (troca de dono) sao persistidos quando
  enviados; caso contrario preservam o valor atual
- Rename de slug propaga para colecao MongoDB, campos RELATIONSHIP e tabelas relacionadas

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 403 | OWNER_CHANGE_FORBIDDEN | Troca de dono por quem nao e o dono atual nem MASTER/ADMINISTRATOR |
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 409 | TABLE_ALREADY_EXISTS | Novo slug ja existe |
| 500 | UPDATE_TABLE_ERROR | Erro interno |

## Testes
- Unit: `update.use-case.spec.ts`
- E2E: `update.controller.spec.ts`
