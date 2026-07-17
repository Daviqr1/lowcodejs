# Sistema de Menus e Autorizacao de Rotas (RBAC)

Modulo responsavel pela definicao de menus estaticos por role, tipagem de itens
de menu e controle de acesso a rotas baseado em papeis (RBAC).

## Arquivos

| Arquivo                      | Descricao                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `menu.ts`                    | `getStaticMenusByCapabilities` retorna menus estaticos (before/after) a partir das capacidades do usuario                                       |
| `menu-route.ts`              | Tipos TypeScript para estrutura de menus: `MenuItem`, `MenuGroupItem`, `MenuRoute`                                                              |
| `menu-access-permissions.ts` | Mapa rota->capacidade (`AREA_CAPABILITY_BY_ROUTE`), rota padrao (`ROLE_DEFAULT_ROUTE`), `hasAreaCapability` e `canAccessRoute` (por capability) |
| `initial-menu-route.ts`      | `resolveInitialMenuRoute()` — resolve a primeira rota navegavel do menu (redirect pos-login); tipo `InitialMenuRoute` (external/internal)       |

## Estrutura de Menus por Role

| Role          | Menus Disponiveis                                                               |
| ------------- | ------------------------------------------------------------------------------- |
| MASTER        | Tabelas, Configuracoes, Menus, Grupos, Usuarios, Ferramentas, Extensões, Perfil |
| ADMINISTRATOR | Tabelas, Menus, Usuarios, Ferramentas, Extensões, Perfil                        |
| MANAGER       | Tabelas, Perfil                                                                 |
| REGISTERED    | Tabelas, Perfil                                                                 |

Todos os menus sao retornados na propriedade `after`. A propriedade `before`
esta vazia para todos os roles e e reservada para menus dinamicos carregados do
backend.

## Controle de Acesso a Rotas

- `AREA_CAPABILITY_BY_ROUTE` mapeia cada rota de area do sistema para a
  capacidade exigida (`MANAGE_*`), espelhando o `PermissionMiddleware` do
  backend
- `ROLE_DEFAULT_ROUTE` define a rota padrao apos login (todas apontam para
  `/tables`)
- `hasAreaCapability(capabilities, capability)` verifica se o usuario possui a
  capacidade (vinda do perfil resolvido pelo backend)
- `canAccessRoute(capabilities, route)` libera a rota quando ela nao exige
  capacidade ou quando o usuario a possui (match exato ou por prefixo de
  segmento)

## Menus Dinamicos

Os menus seguem o padrao `{ before: MenuRoute, after: MenuRoute }`. O array
`before` e reservado para menus dinamicos criados pelo usuario no sistema
(gerenciados via `/menus`). Os menus estaticos ficam em `after`. A composicao
final e `[...before, ...after]`.

Cada opcao de menu dinamico tem `visibility` — um binding
(Grupo/Publico/Ninguem, `{ kind, group }`). O backend resolve a visibilidade
pelos grupos do usuario; `null` = legado/visivel.

## Relacao com o novo modelo de permissoes (backend)

O RBAC foi reescrito: o backend e a fonte de verdade e governa acesso por
**capacidades de area** (`E_AREA_CAPABILITY`) resolvidas pelo fecho de grupos do
usuario (`encompasses[]`), nao por role fixo. As tabelas `ROLE_ROUTES` /
`ROLE_DEFAULT_ROUTE` e `getStaticMenusByRole` aqui sao apenas um **hint
client-side** para montar a navegacao; a autorizacao efetiva (incluindo a
visibilidade de cada menu via binding) e sempre verificada no servidor.
