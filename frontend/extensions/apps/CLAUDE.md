# Pacote `apps` (frontend)

Espelho UI de `backend/extensions/apps/`. Pacote oficial de extensões
**opcionais** — começam desativadas, MASTER ativa em `/extensions`.

## Estrutura

```
apps/
└── modules/
    ├── dashboard/
    │   ├── index.tsx                ← entry default (PageShell + Suspense states)
    │   ├── stat-card.tsx            ← Card reutilizável de estatística
    │   ├── chart-tables.tsx         ← Bar chart "tabelas por mês"
    │   ├── chart-users.tsx          ← Pie chart "usuários por status"
    │   ├── recent-activity.tsx      ← Lista de últimas atividades (formatDistanceToNow ptBR)
    │   ├── dashboard-skeleton.tsx   ← Skeleton enquanto a query carrega
    │   └── use-dashboard-stats.tsx  ← TanStack Query hook → GET /e/apps/dashboard/stats
    └── senhas/
        ├── index.tsx                ← entry default (sidebar de canais + painel de senhas)
        ├── channel-sidebar.tsx      ← Lista de canais (lock/público, contagem, ações do dono)
        ├── channel-dialog.tsx       ← Criar/editar canal (nome, privacidade, membros)
        ├── entry-list.tsx           ← Grid de senhas com revelar/copiar
        ├── entry-dialog.tsx         ← Criar/editar senha (revelar + gerador)
        ├── confirm-dialog.tsx       ← Confirmação genérica de exclusão
        ├── senhas-types.ts          ← Tipos espelhados do backend
        └── use-senhas.tsx           ← Hooks TanStack Query → /e/apps/senhas/*
```

## Entries

| Tipo      | ID          | Path                          | Descrição                                                                                                              |
| --------- | ----------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `modules` | `dashboard` | `modules/dashboard/index.tsx` | Painel administrativo com dados reais (URL `/e/apps/dashboard`, MASTER)                                                |
| `modules` | `senhas`    | `modules/senhas/index.tsx`    | Cofre de senhas (URL `/e/apps/senhas`): canais privados + segredos cifrados. Reusa `ForumUserMultiSelect` para membros |

## Convenções

- Entry é `index.tsx` com `export default function ...`
- Subcomponentes em arquivos separados com nome descritivo (sem prefixo `-`,
  diferente de rotas)
- Hooks de query próprios da extensão moram dentro do diretório do módulo
  (`use-*.tsx`) — diferente do `frontend/src/hooks/tanstack-query/` que é
  reservado a recursos do core
