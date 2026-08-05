# Notifications

Notificacoes in-app por usuario. Persistidas no Mongo e emitidas em tempo real
via Socket.IO no namespace `/notifications`. Disparadas pelo
`NotificationContractService` (forum-mention, kanban-comment-mention, atribuicao
de membros, extensoes).

## Base Route

`/notifications`

## Operacoes

| Operacao | Metodo | Rota | Auth |
|----------|--------|------|------|
| paginated | GET | `/notifications/paginated` | Sim |
| unread-count | GET | `/notifications/unread-count` | Sim |
| mark-as-read | PATCH | `/notifications/:_id/read` | Sim |
| mark-all-as-read | PATCH | `/notifications/read-all` | Sim |
| delete | DELETE | `/notifications/:_id` | Sim |

## Middlewares

`AuthenticationMiddleware({ optional: false })` em todas. Nao ha
`PermissionMiddleware`: cada operacao e **escopada pelo `request.user.sub`** (o
usuario so ve/altera as proprias notificacoes).

## Repositorio

`NotificationContractRepository` — a maioria das operacoes chama o repo direto do
controller (so `paginated` tem use-case). Ver `repositories/notification/CLAUDE.md`.

## Comportamento Chave

- Todas as consultas/escritas filtram por `userId` (dono).
- `mark-as-read` e `delete` retornam 404 quando o `_id` nao pertence ao usuario.
- Frontend consome `paginated` (lista + `unreadOnly`), `unread-count` (badge do
  sino) e recebe push via socket.
