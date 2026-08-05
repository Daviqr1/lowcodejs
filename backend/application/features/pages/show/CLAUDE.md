# Show Page

Exibe uma pagina HTML pelo slug.

## Endpoint
`GET /pages/:slug` | Auth: Yes | Permission: nenhuma especifica

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Validator: PageShowParamsValidator - campos: slug (string, required, min 1)
3. UseCase:
   - Busca menu pelo slug com trashed=false (exact match)
   - Aplica o enforcement de visibilidade do menu (mesmo do `menu/list`)
   - Retorna o documento menu completo (incluindo html) se visivel
4. Repository: MenuContractRepository (findBySlug + findMany), UserContractRepository, GroupResolverContractService

## Regras de Negocio
- Somente menus nao-trashed sao retornados
- Retorna o documento IMenu completo (nome, slug, html, type, etc.)
- **Visibilidade**: aplica o binding `visibility` do menu (Grupo|Public|Nobody)
  de forma ancestor-aware ("pai oculto esconde a subarvore"), reaproveitando
  `MenuVisibility` (`core/menu-visibility.core.ts`) — o mesmo helper usado pelo
  feed da sidebar (`menu/list`). MASTER e ADMINISTRATOR fazem bypass. Sem acesso,
  responde 404 PAGE_NOT_FOUND (mesma resposta de inexistente, nao vaza a
  existencia da pagina)

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | PAGE_NOT_FOUND | Menu com o slug nao existe, esta na lixeira ou o usuario nao tem visibilidade |
| 500 | GET_MENU_ERROR | Erro interno |

## Testes
- Unit: `show.use-case.spec.ts`
- E2E: `show.controller.spec.ts`
