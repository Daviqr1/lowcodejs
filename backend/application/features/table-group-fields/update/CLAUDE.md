# Update Group Field

Atualiza um campo existente dentro de um grupo de uma tabela.

## Endpoint
`PUT /tables/:slug/groups/:groupSlug/fields/:fieldId` | Auth: Yes | Permission: UPDATE_FIELD

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio), TableAccessMiddleware (UPDATE_FIELD)
2. Validator: GroupFieldUpdateBodyValidator - campos: name (string), type (enum E_FIELD_TYPE), trashed (boolean, default false), trashedAt (string nullable, transformado em Date) + TableFieldBaseSchema (required, multiple, `permissions` { list, form, detail } → binding, showInFilter, widthInForm, widthInList, widthInDetail, locked, format, defaultValue, dropdown, relationship, category) | GroupFieldUpdateParamsValidator - campos: slug (string), groupSlug (string), fieldId (string)
3. UseCase:
   - Busca tabela pelo slug (exact match)
   - Encontra o grupo pelo groupSlug
   - Busca o campo pelo fieldId
   - Verifica restricoes de campos nativos (canUpdateNativeField)
   - Verifica restricoes de campos locked (canUpdateLockedField)
   - Gera novo slug via slugify(name) (exceto para nativos, que mantem o slug original)
   - Normaliza o campo group (string -> objeto)
   - Atualiza o campo via fieldRepository.update
   - Atualiza o grupo com o campo atualizado e reconstroi schema do grupo
   - Reconstroi o schema da tabela pai
   - Atualiza a tabela e reconstroi a tabela dinamica via buildTable()
4. Repository: TableContractRepository (findBy, update), FieldContractRepository (findBy, update)

## Regras de Negocio
- Campos nativos: somente visibilidade (showIn*) e largura (width*) sao aplicados; demais campos do payload sao ignorados e os valores armazenados sao preservados
- Campos nativos nao podem ser enviados pra lixeira (NATIVE_FIELD_CANNOT_BE_TRASHED)
- Campos locked (nao-nativos): mesma restricao, validada via canUpdateLockedField (retorna FIELD_LOCKED)
- O slug e recalculado a partir do nome (exceto nativos, que ignoram mudancas de nome)
- Apos atualizacao, schema do grupo e da tabela pai sao reconstruidos

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | GROUP_NOT_FOUND | Grupo nao encontrado na tabela |
| 404 | FIELD_NOT_FOUND | Campo nao encontrado |
| 403 | NATIVE_FIELD_CANNOT_BE_TRASHED | Tentativa de enviar campo nativo pra lixeira |
| 403 | FIELD_LOCKED | Campo locked nao-nativo com alteracao nao permitida |
| 500 | UPDATE_GROUP_FIELD_ERROR | Erro interno durante atualizacao |

## Testes
- Unit: `update.use-case.spec.ts` (nao existe ainda)
- E2E: `update.controller.spec.ts` (nao existe ainda)
