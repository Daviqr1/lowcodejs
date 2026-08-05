# Create Menu

Cria um novo item de menu.

## Endpoint
`POST /menu` | Auth: Yes | Permission: `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)`

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Validator: MenuCreateBodyValidator - campos: name (string, required, min 1), type (enum E_MENU_ITEM_TYPE, required), table (string, nullable, optional), parent (string, nullable, optional), html (string, nullable, optional), url (string, nullable, optional), order (number int min 0, optional) | Transform: gera slug via slugify(name), parent default null | Refinements: url obrigatoria se type=EXTERNAL, html obrigatorio se type=PAGE
3. UseCase:
   - Se tem parent: busca menu pai, concatena slug com slug do pai
   - Verifica duplicidade de slug (menus nao-trashed)
   - Se type=TABLE ou FORM: valida que table existe, gera url automaticamente
   - Se type=PAGE: gera url /pages/{slug}
   - Conta irmaos para auto-atribuir order (posiciona no final)
   - Cria o menu via menuRepository.create
4. Repository: MenuContractRepository (findBy, count, create), TableContractRepository (findBy)

## Regras de Negocio
- O slug e gerado a partir do nome; se tiver parent, concatena slug-pai
- Nao permite slug duplicado entre menus ativos
- Para tipos TABLE/FORM, o campo `table` e obrigatorio e a tabela deve existir
- Para tipo EXTERNAL, o campo `url` e obrigatorio
- Para tipo PAGE, o campo `html` e obrigatorio
- O order e auto-calculado como count de irmaos (posiciona no final)
- O owner vem do request.user.sub

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | PARENT_MENU_NOT_FOUND | Menu pai informado nao existe ou esta na lixeira |
| 409 | MENU_ALREADY_EXISTS | Ja existe menu ativo com o mesmo slug |
| 400 | INVALID_PARAMETERS | Tipo TABLE/FORM sem campo table |
| 404 | TABLE_NOT_FOUND | Tabela informada nao existe |
| 500 | CREATE_MENU_ERROR | Erro interno |

## Testes
- Unit: `create.use-case.spec.ts`
- E2E: `create.controller.spec.ts`
