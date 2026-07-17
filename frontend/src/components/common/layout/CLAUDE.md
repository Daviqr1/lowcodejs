# Layout

Componentes de layout principal da aplicacao: header, sidebar de navegacao,
perfil do usuario, logo e botao de login.

## Arquivos

| Arquivo                 | Descricao                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `index.ts`              | Barrel de exports do modulo                                                                                          |
| `header.tsx`            | Header com SidebarTrigger, InputSearch condicional por rota e area de autenticacao (Profile ou LoginButton)          |
| `sidebar.tsx`           | Sidebar de navegacao recursiva (ate 4 niveis) com suporte a menu dinamico, loading skeleton, links externos e logout |
| `profile.tsx`           | Dropdown de perfil do usuario com avatar, iniciais, link para perfil e logout                                        |
| `logo.tsx`              | Componente de logo que busca imagem do loader data da rota root                                                      |
| `login-button.tsx`      | Botao de login com icone que redireciona para a pagina inicial                                                       |
| `notification-bell.tsx` | Sino de notificacoes: badge de nao-lidas, popover com ultimas 3, marcar (todas) como lida, socket em tempo real      |
| `theme-toggle.tsx`      | Botao de alternancia de tema claro/escuro via `useTheme`                                                             |

## Dependencias principais

- `@tanstack/react-router` para navegacao e location
- `@/components/ui/sidebar` (shadcn) para estrutura da sidebar
- `@/stores/authentication` (Zustand) para estado de autenticacao
- `@/hooks/tanstack-query/use-authentication-sign-out` para logout
- `@/hooks/tanstack-query/use-setting-read` para carregar logo dinamica

## Padroes importantes

- Header oculta InputSearch em rotas configuradas via `routesWithoutSearchInput`
  (aceita string ou RegExp)
- Sidebar renderiza menu recursivamente via `SidebarMenuItemRecursive` com
  profundidade maxima de 4
- Menu suporta tres tipos de item: link interno (`Link`), link externo
  (`<a target="_blank">`), e separador (label estatico)
- Items de menu podem ter `badge` (contador) e `isLoading` (skeleton)
- Sidebar usa `E_MENU_ITEM_TYPE` para distinguir tipos de item de menu
- Logo carregada da configuracao do sistema (`setting.data.LOGO_LARGE_URL`) na
  sidebar
