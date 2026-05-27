# LowCodeJS Frontend

Plataforma low-code construida com React + TanStack Start (SSR) + TypeScript.

## Tech Stack

| Tecnologia             | Versao          | Uso                         |
| ---------------------- | --------------- | --------------------------- |
| React                  | 19.2.0          | UI library                  |
| TanStack React Start   | 1.132.0         | Meta-framework SSR (Nitro)  |
| TanStack React Router  | 1.132.0         | File-based routing          |
| TanStack React Query   | 5.66.5          | Server state management     |
| TanStack React Table   | 8.21.3          | Headless table              |
| TanStack React Form    | 1.0.0           | Form management             |
| TanStack React Virtual | 3.13.20         | Virtualizacao               |
| Zustand                | 5.0.9           | Client state (localStorage) |
| Radix UI               | 35+ primitivos  | Componentes acessiveis      |
| Tailwind CSS           | 4.0.6           | Utility-first CSS           |
| CVA                    | 0.7.1           | Variantes de componentes    |
| Monaco Editor          | 4.7.0           | Editor de codigo            |
| Tiptap                 | 3.13.0          | Editor WYSIWYG              |
| @dnd-kit               | core + sortable | Drag and drop               |
| Axios                  | 1.13.2          | HTTP client                 |
| Socket.IO Client       | 4.8.3           | WebSocket (chat)            |
| Zod                    | 4.2.1           | Validacao                   |
| Lucide React           | 0.544.0         | Icones                      |
| date-fns               | 4.1.0           | Manipulacao de datas        |
| Sonner                 | 2.0.7           | Toast notifications         |
| Vite                   | 7.1.7           | Build tool                  |
| Vitest                 | 3.0.5           | Testes                      |
| TypeScript             | 5.7.2           | Linguagem                   |

## Arquitetura

```mermaid
graph TD
    Entry[router.tsx] --> RootRoute[__root.tsx - Settings + Meta]
    RootRoute --> AuthLayout[/_authentication - Guard publico]
    RootRoute --> PrivateLayout[/_private - Guard autenticado]
    AuthLayout --> SignIn[Sign In]
    AuthLayout --> SignUp[Sign Up]
    PrivateLayout --> Sidebar[Sidebar + Header]
    Sidebar --> Routes[9 areas de rotas]
    Routes --> Dashboard
    Routes --> Tables[Tables - core do low-code]
    Routes --> Users
    Routes --> Groups
    Routes --> Menus
    Routes --> Pages
    Routes --> Profile
    Routes --> Settings
    Routes --> Tools
```

## Fluxo de Inicializacao

1. `router.tsx` - createRouter() com routeTree (auto-gerado) + queryClient como
   context
2. `__root.tsx` - Server function carrega settings do backend - meta tags
   OG/Twitter/structured data
3. `/_authentication/layout.tsx` - beforeLoad: se usuario logado, redireciona
   para ROLE_DEFAULT_ROUTE
4. `/_private/layout.tsx` - beforeLoad: carrega perfil - salva no Zustand - se
   falhar e nao for tabela publica, redireciona para /

Preload strategy: `intent` (prefetch ao hover) Scroll restoration habilitado

## Estrutura de Diretorios

```
frontend/
├── src/
│   ├── router.tsx                  # TanStack Router setup
│   ├── env.ts                      # Validacao de env vars (@t3-oss/env-core)
│   ├── styles.css                  # Tailwind + custom styles + dark mode
│   ├── routeTree.gen.ts            # Auto-gerado pelo TanStack Router
│   │
│   ├── routes/                     # File-based routing (~138 arquivos)
│   │   ├── __root.tsx              # Root layout (settings, meta, TooltipProvider, Sonner)
│   │   ├── robots[.]txt.ts        # SEO
│   │   ├── sitemap[.]xml.ts       # SEO
│   │   ├── _authentication/        # Rotas publicas (sign-in, sign-up)
│   │   └── _private/               # Rotas protegidas (9 areas)
│   │       ├── dashboard/          # Graficos e atividade recente
│   │       ├── tables/             # CRUD tabelas + 9 visualizacoes
│   │       ├── users/              # CRUD usuarios
│   │       ├── groups/             # CRUD grupos de permissao
│   │       ├── menus/              # CRUD menus com reordenacao
│   │       ├── pages/              # Paginas customizadas (menu type=PAGE)
│   │       ├── profile/            # Perfil do usuario
│   │       ├── settings/           # Configuracoes do sistema
│   │       ├── tools/              # Clone, import, export de tabelas
│   │       └── extensions/         # Workshop de extensoes (MASTER)
│   │
│   ├── components/
│   │   ├── ui/                     # Design system (34 componentes shadcn/Radix)
│   │   └── common/                 # Componentes de negocio (16 subdiretorios)
│   │       ├── dynamic-table/      # Sistema central de tabelas dinamicas (9 subdirs)
│   │       ├── calendar/           # Visualizacao calendario
│   │       ├── chat/               # Chat em tempo real
│   │       ├── code-editor/        # Monaco Editor wrapper
│   │       ├── data-table/         # Tabela generica TanStack Table
│   │       ├── datepicker/         # Seletor de data
│   │       ├── document/           # Visualizacao documento
│   │       ├── file-upload/        # Upload de arquivos
│   │       ├── filters/            # Filtros laterais
│   │       ├── forum/              # Forum com canais
│   │       ├── gantt/              # Grafico de Gantt
│   │       ├── layout/             # Header, Sidebar, Logo
│   │       ├── rich-editor/        # Tiptap WYSIWYG
│   │       ├── route-status/       # Telas de erro/loading
│   │       ├── selectors/          # Comboboxes de dominio
│   │       └── tree-editor/        # Editor de arvore
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── use-*.ts               # 11 hooks de dominio
│   │   └── tanstack-query/         # 46+ hooks de API por recurso
│   │       ├── _query-keys.ts      # Factory de query keys hierarquicas
│   │       └── _query-options.ts   # Query options reutilizaveis
│   │
│   ├── lib/                        # Utilitarios compartilhados
│   │   ├── api.ts                  # Axios instance + interceptors
│   │   ├── query-client.ts         # TanStack Query client config
│   │   ├── utils.ts                # cn() helper (clsx + twMerge)
│   │   ├── constant.ts             # Enums (E_FIELD_TYPE, E_ROLE, E_TABLE_TYPE, etc.)
│   │   ├── interfaces.ts           # Tipos (IUser, Meta, IField, ITable, etc.)
│   │   ├── schemas.ts              # Zod schemas compartilhados
│   │   ├── payloads.ts             # DTOs para requisicoes API
│   │   ├── seo.ts                  # createRouteHead() helper
│   │   ├── handle-api-error.ts     # Tratamento de erros API
│   │   ├── table.ts                # Utilitarios de tabela
│   │   ├── menu/                   # Sistema de menu e RBAC
│   │   └── server/                 # Server functions (auth, cookies)
│   │
│   ├── stores/                     # Zustand stores
│   │   └── authentication.ts       # User state + localStorage persistence
│   │
│   └── integrations/               # Configuracoes de integracao
│       ├── tanstack-query/         # QueryClientProvider + devtools
│       └── tanstack-form/          # createFormHook + 40 field components
│
├── extensions/                     # Codigo UI das extensoes — ver extensions/CLAUDE.md
├── vite.config.ts                  # Vite + Nitro + TanStack Start + Tailwind
├── tsconfig.json                   # ES2024, strict, @/* path alias
├── eslint.config.js                # TanStack ESLint + Prettier
├── prettier.config.js              # 80 chars, 2 spaces, single quotes
├── components.json                 # shadcn config (New York, Zinc, CSS vars)
├── .cta.json                       # TanStack Start addon config
└── Dockerfile-*                    # local, production, coolify
```

## Cliente API (Axios)

Arquivo: `lib/api.ts`

- Base URL: resolvida via server function (VITE_API_BASE_URL)
- Credentials: true (cookies enviados/recebidos)
- Content-Type: application/json

Interceptors:

- **Request**: define baseURL + injeta cookies do request context (SSR)
- **Response 401**: limpa Zustand (useAuthStore.clear()) + redireciona para /
  (sign-in)
  - Excecao: rotas publicas (/, /sign-up, /tables/\*) nao redirecionam

## Variaveis de Ambiente

Validadas em `env.ts` com @t3-oss/env-core:

| Variavel          | Tipo   | Default               | Descricao               |
| ----------------- | ------ | --------------------- | ----------------------- |
| VITE_API_BASE_URL | url    | http://localhost:3000 | URL base da API backend |
| VITE_APP_TITLE    | string | (opcional)            | Titulo da aplicacao     |
| SERVER_URL        | url    | (opcional)            | URL do servidor SSR     |

Producao: `docker-entrypoint.sh` substitui URLs hardcoded nos build artifacts em
runtime.

## Estilizacao

- **Tailwind CSS v4** via @tailwindcss/vite plugin
- **styles.css**: cores custom oklch (brand-orange, brand-blue-dark/mid), design
  tokens (--radius, --font-sans/mono), dark mode via classe .dark
- **cn()** em lib/utils.ts: `clsx(...inputs) → twMerge()` para composicao de
  classes sem conflito
- **Animacoes**: float, fade-in, slide-up, pulse-dot, shimmer
- **Suporte**: reduced-motion, print styles

## Estado Global

### Zustand (`stores/authentication.ts`)

- Store: useAuthStore
- Estado: user (IUser|null), isAuthenticated (boolean), hasHydrated (boolean)
- Acoes: setUser(), clear(), setHasHydrated()
- Persistencia: localStorage key `low-code-js-auth`, SSR-safe (storage vazio no
  server)
- Uso fora de React: `useAuthStore.getState().setUser(user)`

### TanStack Query (`lib/query-client.ts`)

- retry: false
- refetchOnWindowFocus: true
- staleTime: 1 hora
- Integrado ao TanStack Router via context (permite uso em beforeLoad/loader)

## Roteamento

File-based routing com TanStack Router. Rotas auto-geradas em
`routeTree.gen.ts`.

### Convencoes de Arquivo

| Pattern          | Significado                                          | Exemplo                         |
| ---------------- | ---------------------------------------------------- | ------------------------------- |
| `index.tsx`      | Route config (createFileRoute) com loader/beforeLoad | `tables/index.tsx`              |
| `index.lazy.tsx` | Componente UI (createLazyFileRoute) - lazy loaded    | `tables/index.lazy.tsx`         |
| `$param`         | Segmento dinamico                                    | `$slug/`, `$userId/`            |
| `-prefixed.tsx`  | Componente privado da rota (nao e rota)              | `-table-users.tsx`              |
| `_prefixed/`     | Pathless layout (nao gera URL)                       | `_authentication/`, `_sign-in/` |
| `layout.tsx`     | Layout wrapper para rotas filhas                     | `_private/layout.tsx`           |

### Data Loading

- `beforeLoad`: guards de auth + dados criticos (perfil, permissoes)
- `loader`: dados da pagina via queryOptions (prefetch)
- `useSuspenseQuery`: queries adicionais nos componentes (integra com Suspense
  boundaries)

### Error Boundaries

`QueryErrorResetBoundary` + `react-error-boundary` envolvem o Outlet para
capturar erros de queries e permitir retry.

## Sistema de Permissoes (RBAC)

| Role          | Acesso                                              |
| ------------- | --------------------------------------------------- |
| MASTER        | Tudo (dashboard, settings, tools, todas as tabelas) |
| ADMINISTRATOR | Tabelas, menus, usuarios                            |
| MANAGER       | Tabelas (respeita ownership)                        |
| REGISTERED    | Tabelas (VIEW + CREATE_ROW apenas)                  |

Implementado em:

- `lib/menu/menu-access-permissions.ts`: ROLE_ROUTES (rotas por role),
  ROLE_DEFAULT_ROUTE (redirect pos-login), canAccessRoute(role, route)
- `lib/menu/menu.ts`: getStaticMenusByRole(role) retorna menus before/after
- `hooks/use-table-permission.ts`: verifica permissoes granulares
  (VIEW/CREATE/UPDATE/REMOVE para TABLE/FIELD/ROW)

Visibilidade de tabela (para visitantes nao autenticados):

| Visibilidade | Comportamento                |
| ------------ | ---------------------------- |
| PUBLIC       | Visualizacao liberada        |
| FORM         | Criacao de registro liberada |
| OPEN         | VIEW + CREATE_ROW            |
| RESTRICTED   | VIEW only                    |
| PRIVATE      | Bloqueado                    |

## Formularios

Sistema central em `integrations/tanstack-form/`:

- `form-hook.ts`: createFormHook registra 40 field components - exporta
  useAppForm + withForm
- `form-context.ts`: createFormHookContexts - fieldContext, formContext
- `use-field-validation.ts`: hook retorna { field, isInvalid, errors }
  (touched + invalid)

### Field Components (4 categorias)

| Categoria      | Arquivo                | Quantidade | Exemplos                                                        |
| -------------- | ---------------------- | ---------- | --------------------------------------------------------------- |
| Base (leves)   | fields/base.ts         | 14         | FieldText, FieldEmail, FieldSwitch, FieldFileUpload             |
| Rich (pesados) | fields/rich.ts         | 2          | FieldCodeEditor (Monaco), FieldEditor (Tiptap)                  |
| Table Config   | fields/table-config.ts | 14         | TableFieldTypeSelect, TableFieldDropdownOptions                 |
| Table Row      | fields/table-row.ts    | 10         | TableRowTextField, TableRowDateField, TableRowRelationshipField |

Componentes pesados (Monaco ~2MB, Tiptap ~500KB) usam React.lazy para nao
impactar bundle inicial.

## Tipos e Interfaces

| Arquivo             | Conteudo                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/constant.ts`   | Enums: E_FIELD_TYPE (14 tipos), E_FIELD_FORMAT (15 formatos), E_ROLE (4), E_TABLE_TYPE (2), E_TABLE_STYLE (9 visualizacoes), E_TABLE_VISIBILITY (5), E_TABLE_COLLABORATION (2), E_TABLE_PERMISSION (12) |
| `lib/interfaces.ts` | Tipos: IUser, ITable, IField, IRow, IMenu, IPermission, ISetting, Meta (paginacao), etc.                                                                                                                |
| `lib/schemas.ts`    | Zod schemas compartilhados entre formularios                                                                                                                                                            |
| `lib/payloads.ts`   | DTOs tipados para requisicoes API                                                                                                                                                                       |

## Build & Deploy

| Comando         | Descricao                                               |
| --------------- | ------------------------------------------------------- |
| `npm run dev`   | Vite dev server (SSR hot reload, porta 5173)            |
| `npm run build` | Build producao (NODE_OPTIONS --max-old-space-size=8192) |
| `npm start`     | Serve .output/server/index.mjs (Nitro)                  |
| `npm run test`  | Vitest                                                  |
| `npm run lint`  | Prettier + ESLint (auto-fix)                            |

### Vite Config

- Plugins: Nitro (node-server preset), TanStack Start, Tailwind CSS Vite, React,
  tsconfig-paths
- Dev: porta 5173, host 0.0.0.0

### Docker

| Dockerfile            | Uso                                        | Porta |
| --------------------- | ------------------------------------------ | ----- |
| Dockerfile-local      | Desenvolvimento (npm run dev --host)       | 5173  |
| Dockerfile-production | Multi-stage build, usuario non-root (1001) | 3000  |
| Dockerfile-coolify    | Producao otimizado com healthcheck         | 3000  |

Build args (producao): VITE_API_BASE_URL, APP_SERVER_URL, APP_CLIENT_URL,
LOGO_SMALL_URL, LOGO_LARGE_URL Runtime: docker-entrypoint.sh substitui URLs
hardcoded nos artifacts

## Componentes UI (Design System)

34 componentes em `components/ui/` baseados em Radix UI + shadcn pattern.

Padroes:

- CVA (class-variance-authority) para variantes de estilo
- `data-slot` attribute em todo componente raiz
- `asChild` pattern via @radix-ui/react-slot
- `cn()` para merge de classes
- Compound components para componentes complexos (Card, Table, Sidebar, Dialog)

## Componentes de Negocio

16 subdiretorios em `components/common/`. O mais importante e `dynamic-table/`
(9 subdirs) que implementa o sistema central de tabelas dinamicas do low-code.

Cada subdiretorio tem seu proprio CLAUDE.md com documentacao detalhada.

## SEO

- `robots[.]txt.ts` e `sitemap[.]xml.ts` como rotas
- `lib/seo.ts`: createRouteHead() gera meta tags
- `__root.tsx`: meta tags OG, Twitter, JSON-LD structured data
- Settings do sistema (nome, descricao) carregados via server function

## Extensoes

Espelho frontend de `backend/extensions/` para o codigo de UI. Ver
`frontend/extensions/CLAUDE.md` para o contrato. Workshop de gestao em
`/extensions` (rota MASTER):

- Lista as extensoes registradas no DB (descobertas pelo loader do backend)
- Toggle de ativacao via `useExtensionToggle`
- Configuracao de escopo por tabela para plugins via
  `useExtensionConfigureTableScope`

Tipos em `IExtension` (lib/interfaces.ts), enum `E_EXTENSION_TYPE`
(lib/constant.ts), payloads em lib/payloads.ts.

## Convencoes de Nomenclatura

| Tipo               | Pattern                      | Exemplo                      |
| ------------------ | ---------------------------- | ---------------------------- |
| Componente         | PascalCase                   | `DataTable`, `FilterSidebar` |
| Hook               | use-kebab-case.ts            | `use-data-table.ts`          |
| Hook API           | use-{recurso}-{operacao}.tsx | `use-table-create.tsx`       |
| Rota config        | index.tsx                    | `tables/index.tsx`           |
| Rota componente    | index.lazy.tsx               | `tables/index.lazy.tsx`      |
| Componente privado | -{nome}.tsx                  | `-table-users.tsx`           |
| Utilitario         | kebab-case.ts                | `handle-api-error.ts`        |
| Store              | kebab-case.ts                | `authentication.ts`          |
| Tipo/Interface     | I{Nome} ou E\_{NOME}         | `IUser`, `E_ROLE`            |
