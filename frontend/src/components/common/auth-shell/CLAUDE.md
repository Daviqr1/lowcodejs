# Auth Shell

Wrapper de layout das páginas públicas de autenticação e do fluxo de setup.
Renderiza um layout de duas colunas (painel de marca + conteúdo) responsivo, com
branding carregado das settings do sistema.

## Arquivos

| Arquivo           | Descrição                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `index.ts`        | Barrel: exporta `AuthShell`, `BrandPanel`, `AppPreview`                                                                  |
| `auth-shell.tsx`  | Layout em grid de 2 colunas (`lg+`): `BrandPanel` à esquerda e área de conteúdo centralizada (com `Logo` no mobile)      |
| `brand-panel.tsx` | Painel de marca: imagem de fundo customizada (settings) **ou** gradiente da marca com logo, headline, features e preview |
| `app-preview.tsx` | Mockup decorativo (aria-hidden) de uma janela da aplicação: topbar, mini tabela dinâmica e cartão de estatística         |

## Props

| Componente   | Props                                                    |
| ------------ | -------------------------------------------------------- |
| `AuthShell`  | `children: React.ReactNode`, `contentClassName?: string` |
| `BrandPanel` | `className?: string`                                     |
| `AppPreview` | `className?: string`                                     |

## Convenções

- Mobile: coluna única com `Logo` no topo; `BrandPanel` fica oculto
  (`hidden lg:flex`)
- `BrandPanel` lê `loginBackgroundUrl` e `baseUrl` do loader raiz
  (`getRouteApi('__root__').useLoaderData()`); se a URL é relativa, prefixa
  `baseUrl`. Com background customizado, renderiza imagem full-cover; senão, o
  painel branded padrão
- Animações de entrada via `animate-rise-in` / `stagger-item`
- Consumido por `_authentication/layout.tsx`
  (`<AuthShell><Outlet /></AuthShell>`) e por `setup/layout.tsx` (com
  `contentClassName="max-w-xl"` + Stepper)
- Sem dependência de stores ou hooks de API — apenas dados do loader raiz e
  `cn()`
