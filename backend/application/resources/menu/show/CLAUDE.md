# Show Menu

Exibe um menu pelo ID, incluindo seus filhos diretos.

## Endpoint
`GET /menu/:_id` | Auth: Yes | Permission: `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)`

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Validator: MenuShowParamValidator - campos: _id (string, required, min 1)
3. UseCase:
   - Busca o menu pelo _id via menuRepository.findBy (exact)
   - Busca os filhos diretos: menuRepository.findMany com parent=_id, trashed=false, sort order asc
   - Retorna o menu com campo children adicionado
4. Repository: MenuContractRepository (findBy, findMany)

## Regras de Negocio
- Retorna o menu mesmo que esteja na lixeira (nao filtra por trashed)
- Inclui array de children (filhos diretos nao-trashed, ordenados por order)

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | MENU_NOT_FOUND | Menu com o _id nao existe |
| 500 | GET_MENU_BY_ID_ERROR | Erro interno |

## Testes
- Unit: `show.use-case.spec.ts`
- E2E: `show.controller.spec.ts`
