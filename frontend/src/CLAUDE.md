# src — Raiz do Código-Fonte Frontend

Ponto de entrada da aplicação React + TanStack Start (SSR). Contém configuração
global, estilos e o entry point do roteador.

## Arquivos

| Arquivo            | Descrição                                                                           |
| ------------------ | ----------------------------------------------------------------------------------- |
| `router.tsx`       | Factory `getRouter()` — cria TanStack Router com routeTree, queryClient e SSR setup |
| `env.ts`           | Validação de env vars via `@t3-oss/env-core` (VITE_API_BASE_URL, SERVER_URL, etc.)  |
| `styles.css`       | Tailwind CSS v4 + tokens de design (cores oklch, radius, fontes, animações)         |
| `routeTree.gen.ts` | **Auto-gerado** pelo TanStack Router — não editar manualmente                       |
| `logo.svg`         | Logo padrão da aplicação                                                            |

## Subdiretórios

| Diretório       | Responsabilidade                                           |
| --------------- | ---------------------------------------------------------- |
| `routes/`       | File-based routing (~138 arquivos de rota)                 |
| `components/`   | Design system (`ui/`) + componentes de negócio (`common/`) |
| `hooks/`        | Custom hooks + 110 hooks TanStack Query                    |
| `integrations/` | Setup de TanStack Form e TanStack Query                    |
| `lib/`          | Utilitários, tipos, schemas, constantes, API client        |
| `stores/`       | Estado global Zustand (autenticação)                       |
