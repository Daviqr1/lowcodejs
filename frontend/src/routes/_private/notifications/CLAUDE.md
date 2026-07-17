# Notificações

Central de notificações do usuário. Lista paginada com abas (todas / não lidas),
ações de marcar como lida, marcar todas como lidas e excluir. Rota
`/notifications`.

## Rota

| Rota             | Descrição                                 |
| ---------------- | ----------------------------------------- |
| `/notifications` | Central de notificações do usuário logado |

## Arquivos

| Arquivo          | Tipo       | Descrição                                                                      |
| ---------------- | ---------- | ------------------------------------------------------------------------------ |
| `index.tsx`      | Loader     | `createFileRoute` apenas com head `Notificações` — sem loader nem `beforeLoad` |
| `index.lazy.tsx` | Componente | UI completa: abas, lista paginada, indicadores de leitura e ações              |

## Fluxo

1. Estado local controla aba (`Todas` / `Não lidas`) e página; a paginação não
   usa search params
2. `useNotificationPaginated({ page, perPage: 20, unreadOnly })` busca os itens
3. Cada item mostra indicador de leitura (ponto azul / check), título (negrito
   se não lida), corpo (line-clamp-3), data formatada e botões de marcar lida /
   excluir
4. Clique numa notificação: se não lida, marca como lida e navega para
   `notification.action.href` (`type='url'` → `window.location.href`; senão,
   navegação do router)

## Hooks

| Hook                           | Uso                                                      |
| ------------------------------ | -------------------------------------------------------- |
| `useNotificationPaginated`     | Lista paginada (suporta `unreadOnly`)                    |
| `useNotificationMarkAsRead`    | Marca uma notificação como lida                          |
| `useNotificationMarkAllAsRead` | Marca todas como lidas (toast de sucesso com a contagem) |
| `useNotificationDelete`        | Exclui uma notificação                                   |

## Convenções

- Sem WebSocket/tempo real nesta tela (busca sob demanda)
- Estados vazios: `Spinner` durante o carregamento; ícone `BellOff` + "Sem
  notificações por aqui." quando a lista está vazia
- Acesso garantido pelo `_private/layout.tsx` (apenas autenticados)
