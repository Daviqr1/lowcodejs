# Notification Repository

Repositorio da entidade Notification (notificacoes in-app por usuario).
Alimenta o recurso `/notifications` + emissao via Socket.IO `/notifications`.

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `notification-contract.repository.ts` | Classe abstrata + payload types |
| `notification.repository.ts` | Implementacao com Mongoose |

> Sem `in-memory`: coberto por e2e.

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `create(payload)` | `INotification` | Cria uma notificacao |
| `createMany(payloads)` | `INotification[]` | Cria em lote (uma por destinatario) |
| `findById(_id)` | `INotification \| null` | Busca por _id |
| `paginatedByUser(payload)` | `Paginated<INotification>` | Lista paginada do usuario (com `unreadOnly` opcional) |
| `countUnread(userId)` | `number` | Conta nao lidas do usuario (badge do sino) |
| `markAsRead(_id, userId)` | `INotification \| null` | Marca uma como lida (checa dono) |
| `markAllAsRead(userId)` | `number` | Marca todas as do usuario como lidas |
| `delete(_id, userId)` | `boolean` | Remove uma (checa dono) |

## Payloads

- `NotificationCreatePayload` - userId, type (E_NOTIFICATION_TYPE), title, body?, action? (`{type,href,label}`), source? (`{pkg,tableSlug,rowId,anchorId}`), actorUserId?
- `NotificationListPayload` - userId, page, perPage, unreadOnly?

## Comportamentos Unicos

- Todas as operacoes de leitura/escrita sao **escopadas por `userId`** (dono)
- `createMany` gera uma notificacao por destinatario (usado pelo `NotificationService.notify`, que deduplica e exclui o `actorUserId`)
- `action`/`source` sao subdocumentos opcionais para deep-link in-app
