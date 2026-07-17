# routes — Roteamento File-Based

Todas as rotas da aplicação usando TanStack Router file-based routing. O arquivo
`routeTree.gen.ts` (em `src/`) é gerado automaticamente a partir desta
estrutura.

## Arquivos na Raiz

| Arquivo            | Descrição                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `__root.tsx`       | Layout raiz: carrega settings do sistema via server function, define meta tags OG/Twitter/JSON-LD, configura `TooltipProvider` e `Sonner` |
| `robots[.]txt.ts`  | Rota que serve `robots.txt` dinamicamente                                                                                                 |
| `sitemap[.]xml.ts` | Rota que serve `sitemap.xml` dinamicamente                                                                                                |

## Subdiretórios

| Diretório          | URL base | Tipo            | Responsabilidade                                     |
| ------------------ | -------- | --------------- | ---------------------------------------------------- |
| `_authentication/` | —        | Pathless layout | Guard público (redireciona autenticados)             |
| `_private/`        | —        | Pathless layout | Guard autenticado + Sidebar + Header                 |
| `setup/`           | `/setup` | Route group     | Wizard de onboarding inicial (tem CLAUDE.md próprio) |

## Convenções de Arquivo

| Pattern          | Tipo               | Exemplo                                            |
| ---------------- | ------------------ | -------------------------------------------------- |
| `index.tsx`      | Route config       | `loader`, `head`, `beforeLoad`, `pendingComponent` |
| `index.lazy.tsx` | Componente UI      | Lazy-loaded, usa `useSuspenseQuery`                |
| `-prefixed.tsx`  | Componente privado | Não gera rota                                      |
| `$param`         | Segmento dinâmico  | `$slug/`, `$userId/`                               |
| `_prefixed/`     | Pathless layout    | Não adiciona segmento na URL                       |
| `layout.tsx`     | Layout de grupo    | Wraps rotas filhas                                 |
