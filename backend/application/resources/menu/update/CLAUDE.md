# Update Menu

Atualiza um item de menu existente.

## Endpoint
`PATCH /menu/:_id` | Auth: Yes | Permission: `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)`

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Validator: MenuUpdateParamsValidator - campos: _id (string, required) | MenuUpdateBodyValidator - campos: name (string, optional), type (enum E_MENU_ITEM_TYPE, optional), table (string, nullable, optional), parent (string, nullable, optional), html (string, nullable, optional), url (string, nullable, optional), order (number int min 0, optional) | Transform: gera slug via slugify(name) se name informado, parent default null | Refinements: url obrigatoria se type=EXTERNAL, html obrigatorio se type=PAGE
3. UseCase:
   - Busca menu existente pelo _id (nao-trashed)
   - Calcula slug final:
     - Se parent mudou: valida que nao e auto-referencia, verifica referencia circular via findDescendantIds, busca parent e concatena slugs
     - Se parent nao mudou mas ja tinha parent: mantém concatenacao com parent atual
   - Verifica duplicidade de slug (se mudou)
   - Se type=TABLE/FORM: valida table e gera url
   - Se type=PAGE: gera url /pages/{slug}
   - Se parent mudou e order nao informado: auto-calcula order como count de irmaos
   - Atualiza via menuRepository.update
4. Repository: MenuContractRepository (findBy, findDescendantIds, count, update, findMany), TableContractRepository (findBy)

## Regras de Negocio
- Menu nao pode ser pai de si mesmo
- Protecao contra referencia circular: verifica se o novo parent nao e descendente do menu
- Slug e recalculado quando nome ou parent muda
- Se parent muda e order nao foi informado, posiciona no final dos irmaos
- Mesmas regras de tipo (TABLE/FORM/EXTERNAL/PAGE) do create

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | MENU_NOT_FOUND | Menu nao encontrado ou esta na lixeira |
| 400 | CIRCULAR_REFERENCE | Auto-referencia ou novo parent e descendente |
| 404 | PARENT_MENU_NOT_FOUND | Menu pai informado nao existe ou esta na lixeira |
| 409 | MENU_ALREADY_EXISTS | Ja existe menu ativo com o novo slug |
| 400 | INVALID_PARAMETERS | Tipo TABLE/FORM sem campo table |
| 404 | TABLE_NOT_FOUND | Tabela informada nao existe |
| 500 | UPDATE_MENU_ERROR | Erro interno |

## Testes
- Unit: `update.use-case.spec.ts`
- E2E: `update.controller.spec.ts`
