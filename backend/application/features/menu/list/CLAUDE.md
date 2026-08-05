# List Menu

Lista todos os menus ativos (nao-trashed), ordenados por order e name.

## Endpoint
`GET /menu` | Auth: Yes | Permission: AUTH-ONLY (sem PermissionMiddleware)

E a unica operacao do recurso `menu/` que NAO usa
`PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU)`: e o feed de navegacao da
sidebar consumido por qualquer usuario autenticado. A restricao de acesso e
feita no use-case via filtragem por visibilidade (ver Regras de Negocio).

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio) — roda primeiro
2. Validator: nenhum (sem parametros)
3. UseCase:
   - Busca todos os menus via menuRepository.findMany com trashed: false
   - Ordena por order asc, name asc
   - FILTRA por visibilidade de cada item (ver Regras de Negocio)
   - Retorna array de menus visiveis
4. Repository: MenuContractRepository (findMany)

## Regras de Negocio
- Retorna apenas menus nao-trashed
- Ordenacao padrao: order asc, name asc
- Retorna lista plana (nao hierarquica)
- Filtragem server-side por `visibility` de cada menu (Grupo|Public|Nobody):
  PUBLIC visivel, NOBODY oculto, GROUP visivel so para quem esta no grupo (fecho
  transitivo); binding ausente (menu legado) = visivel
- Ancestor-aware: "pai oculto esconde a subarvore" — um menu so e visivel se ele
  proprio e todos os seus ancestrais forem visiveis
- Permissao da tabela vinculada: menu do tipo TABLE so aparece se o usuario tem
  VIEW_TABLE da tabela; menu do tipo FORM exige CREATE_ROW. A checagem reaproveita
  `PermissionService.checkTableAccess` (perfil de membro + binding por acao +
  dono). Tabela inexistente ou na lixeira oculta a opcao. Tabelas vinculadas sao
  carregadas em batch (`findMany({ _ids })`) e o acesso e cacheado por
  `tabela:acao`
- MASTER e ADMINISTRATOR fazem bypass do filtro (enxergam todos os menus)
- Espelha o `isMenuVisible` do frontend

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 500 | LIST_MENU_ERROR | Erro interno |

## Testes
- Unit: `list.use-case.spec.ts`
- E2E: `list.controller.spec.ts`
