# senhas (módulo `apps`, frontend)

Entry UI do cofre de senhas (URL `/e/apps/senhas`, qualquer autenticado):
canais privados por padrão + segredos cifrados em repouso. Layout `PageShell`
com sidebar de canais + painel de senhas.

| Arquivo                  | Papel                                                    |
| ------------------------ | -------------------------------------------------------- |
| `index.tsx`              | Entry `export default` (sidebar + painel)                |
| `use-senhas.tsx`         | Hooks TanStack Query → `/e/apps/senhas/*`                |
| `channel-sidebar.tsx`    | Lista de canais (cadeado privado, contagem, ações dono)  |
| `channel-dialog.tsx`     | Criar/editar canal (nome, privacidade, membros)          |
| `member-multi-select.tsx`| Combobox multi-select de membros do canal                |
| `entry-list.tsx`         | Grid de senhas com revelar/copiar                        |
| `entry-dialog.tsx`       | Criar/editar senha (revelar + gerador)                   |
| `confirm-dialog.tsx`     | Confirmação genérica de exclusão                         |
| `senhas-types.ts`        | Tipos espelhados do backend                              |

Declaração canônica + criptografia no backend. Ver [../CLAUDE.md](../CLAUDE.md) e
`backend/extensions/apps/modules/senhas/`.
