# Layout Privado (\_private)

Layout autenticado da aplicacao com sidebar lateral e header superior. Todas as
rotas filhas herdam a protecao de autenticacao definida no `beforeLoad`.

## Guarda de Autenticacao (beforeLoad)

- Carrega o perfil do usuario via `profileDetailOptions()` (TanStack Query)
- Salva o usuario no Zustand (`useAuthStore.setUser`)
- Se falhar, limpa o store e redireciona para `/` (login)
- Excecao: rotas de visualizacao publica de tabela (`/tables/:slug` e
  `/tables/:slug/row/:id`) sao liberadas mesmo sem autenticacao -- o backend
  controla pelos bindings de `table.permissions` (acao com binding PUBLIC)

## Componente (PrivateLayout)

- Usa `SidebarProvider` para gerenciar estado da sidebar
- Carrega menus dinamicos via `useMenuDynamic(role)` baseado no grupo do usuario
- Se nao autenticado (acesso publico permitido): renderiza apenas Header +
  Outlet sem sidebar
- Se autenticado: renderiza Sidebar + SidebarInset com Header + Outlet
- Envolve o Outlet com `QueryErrorResetBoundary` + `ErrorBoundary` para
  tratamento de erros
- Define `routesWithoutSearchInput` para ocultar o campo de busca em rotas
  especificas

## Subdiretorios

| Diretorio        | URL                                                                        | Descricao                                     | Roles               |
| ---------------- | -------------------------------------------------------------------------- | --------------------------------------------- | ------------------- |
| `dashboard/`     | `/dashboard`                                                               | Painel com estatisticas e graficos            | MASTER              |
| `e/`             | `/e/:package/:id`                                                          | Loader dinamico de modulos de extensao        | Varia por extensao  |
| `error-logs/`    | `/error-logs`                                                              | Historico de erros HTTP registrados           | MASTER              |
| `extensions/`    | `/extensions`                                                              | Workshop de gestao de extensoes               | MASTER              |
| `groups/`        | `/groups`, `/groups/create`, `/groups/:id`                                 | CRUD de grupos de permissao                   | MASTER              |
| `logs/`          | `/logs`                                                                    | Historico de atividade do sistema             | MASTER              |
| `menus/`         | `/menus`, `/menus/create`, `/menus/:id`                                    | CRUD de itens de menu                         | MASTER              |
| `notifications/` | `/notifications`                                                           | Central de notificacoes do usuario            | Todos autenticados  |
| `pages/`         | `/pages/:slug`                                                             | Paginas customizadas (tipo PAGE do menu)      | Todos autenticados  |
| `profile/`       | `/profile`                                                                 | Visualizacao e edicao do perfil do usuario    | Todos autenticados  |
| `settings/`      | `/settings`                                                                | Configuracoes gerais do sistema               | MASTER              |
| `tables/`        | `/tables`, `/tables/:slug`, `/tables/:slug/row/*`, `/tables/:slug/field/*` | CRUD de tabelas dinamicas, campos e registros | Varia por permissao |
| `tools/`         | `/tools`                                                                   | Ferramentas administrativas (clonar tabelas)  | MASTER              |
| `users/`         | `/users`, `/users/create`, `/users/:id`                                    | CRUD de usuarios                              | MASTER              |

## Padroes de Roteamento

- **File-based routing**: TanStack Router gera rotas a partir da estrutura de
  arquivos
- **Split de arquivos**: `index.tsx` para loader/head/beforeLoad,
  `index.lazy.tsx` para o componente (lazy loading)
- **Parametros dinamicos**: prefixo `$` (ex: `$slug.tsx` gera `:slug`)
- **Componentes privados**: prefixo `-` (ex: `-chart-tables.tsx`) nao gera rota,
  usado como componente interno
- **SEO**: `head` com `noindex, nofollow` no layout; cada rota filha define seu
  proprio `title` via `createRouteHead`
