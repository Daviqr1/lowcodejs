# `apps/modules` (frontend)

Entries React dos módulos do pacote `apps` (extensões opcionais — começam
desativadas, MASTER ativa em `/extensions`). Módulos são telas com URL própria
(`/e/<pkg>/<id>`), montadas pela rota dinâmica
`routes/_private/e/$package/$id/`. A declaração canônica vive em
`backend/extensions/apps/modules/`.

## Extensões

| ID          | URL default         | Entry                 | Descrição                                                                                                               |
| ----------- | ------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `dashboard` | `/e/apps/dashboard` | `dashboard/index.tsx` | Painel administrativo com dados reais (MASTER)                                                                          |
| `senhas`    | `/e/apps/senhas`    | `senhas/index.tsx`    | Cofre de senhas inspirado no passbolt: canais privados por padrão + segredos cifrados em repouso (qualquer autenticado) |

## senhas

Layout `PageShell` com sidebar de canais (esquerda) + painel de senhas
(direita). Dados via `use-senhas.tsx` (TanStack Query → CRUD em
`/e/apps/senhas/channels` e `.../entries`). Reusa `ForumUserMultiSelect` do core
para selecionar membros. O segredo das entradas só é revelado sob demanda (botão
olho) e copiável para a área de transferência. Subcomponentes:

| Arquivo               | Papel                                                   |
| --------------------- | ------------------------------------------------------- |
| `channel-sidebar.tsx` | Lista de canais (cadeado privado, contagem, ações dono) |
| `channel-dialog.tsx`  | Criar/editar canal (nome, descrição, privado, membros)  |
| `entry-list.tsx`      | Grid de senhas com revelar/copiar/editar/excluir        |
| `entry-dialog.tsx`    | Criar/editar senha (revelar + gerador de senha forte)   |
| `confirm-dialog.tsx`  | Confirmação genérica de exclusão                        |
| `senhas-types.ts`     | Tipos espelhados do backend                             |
| `use-senhas.tsx`      | Hooks de query/mutation do módulo                       |

## dashboard

Painel com `PageShell` + estados de Suspense. Os dados vêm de
`use-dashboard-stats.tsx` (TanStack Query → `GET /e/apps/dashboard/stats`).
Subcomponentes:

| Arquivo                  | Papel                                                     |
| ------------------------ | --------------------------------------------------------- |
| `stat-card.tsx`          | Card reutilizável de estatística                          |
| `chart-tables.tsx`       | Bar chart "tabelas por mês"                               |
| `chart-users.tsx`        | Pie chart "usuários por status"                           |
| `recent-activity.tsx`    | Lista de atividades recentes (`formatDistanceToNow` ptBR) |
| `dashboard-skeleton.tsx` | Skeleton enquanto a query carrega                         |

## Convenções

- Entry é **index.tsx** com `export default function ...`
- Subcomponentes ficam em arquivos separados com nome descritivo (sem prefixo
  `-`, diferente das rotas)
- O hook de query da extensão mora dentro do próprio diretório do módulo
  (`use-*.tsx`) — `frontend/src/hooks/tanstack-query/` é reservado a recursos do
  core
