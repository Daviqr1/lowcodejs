# Row Member Notification Service

Notifica novos membros atribuidos a um registro (rows de tabelas KANBAN/CALENDAR
com campo de participantes). Reusa o `NotificationContractService` do core.

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `row-member-notification-contract.service.ts` | Abstract class + `NotifyRowMembersParams` |
| `row-member-notification.service.ts` | Impl (`@Service() export default`) |
| `in-memory-row-member-notification.service.ts` | Mock para testes |

## Contrato

```typescript
notifyNewMembers(params: NotifyRowMembersParams): Promise<void>
```

## Comportamento Chave

- Compara os membros antes/depois do save e notifica **apenas os novos**.
- O ator (quem fez a alteracao) e excluido dos destinatarios.
- Disparo fire-and-forget (erros logados, nao propagados) — nao bloqueia o save.

DI: registrado pelo scanner. Consumido pelos use-cases de `table-rows/update`.
