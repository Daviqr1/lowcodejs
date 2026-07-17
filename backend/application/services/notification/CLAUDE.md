# Notification Service

Cria notificacoes in-app (uma por usuario) e emite via Socket.IO no namespace
`/notifications`. Servico de dominio reusado por forum-mention,
kanban-comment-mention, atribuicao de membros e extensoes.

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `notification-contract.service.ts` | Abstract class + `NotifyPayload` |
| `notification.service.ts` | Impl (`@Service() export default`) |
| `in-memory-notification.service.ts` | Mock para testes |

## Contrato

```typescript
notify(payload: NotifyPayload): Promise<INotification[]>
```

`NotifyPayload`: `{ userIds, type, title, body?, action?, source?, actorUserId? }`.

## Comportamento Chave

- `userIds` deduplicado; `actorUserId` (o ator) e **excluido** dos destinatarios.
- Persiste via `NotificationContractRepository.createMany` e emite push por
  socket a cada destinatario.
- Disparo fire-and-forget nos consumidores (erros logados, nao propagados).

DI: registrado pelo scanner. Ver `repositories/notification/CLAUDE.md`.
