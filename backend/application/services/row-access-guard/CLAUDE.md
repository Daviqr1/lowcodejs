# Row Access Guard Service

Compoe o controle de acesso a rows a partir dos **guards** registrados por
extensoes (plugins `kind: 'row-access-guard'`). Orquestra os contratos
`RowAccessGuard` do core (`core/extensions/row-access-guard.contract.ts`).

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `row-access-guard-contract.service.ts` | Abstract class |
| `row-access-guard.service.ts` | Impl (`@Service() export default`) |
| `in-memory-row-access-guard.service.ts` | Mock para testes |
| `row-access-guard.service.spec.ts` | Unit tests |

## Contrato

```typescript
resolveContext(...)        // monta GuardEvalContext (user, groupIds, isPrivileged)
composeListQuery(...)      // compoe fragmentos: $and (restrictive) / $or (permissive)
composeReadDecision(...)   // allow > deny > abstain
composeWriteDecision(...)
composeSanitize(...)       // so guards restrictive sanitizam o payload
```

## Comportamento Chave

- **Bypass privilegiado global**: usuarios com fecho MASTER/ADMINISTRATOR pulam
  TODOS os guards (decidido em `resolveContext` via `ctx.isPrivileged`).
- Descobre os guards ativos da tabela via
  `ExtensionContractRepository.findActiveForTable` (respeita `tableScope`).
- Composicao: restrictive adiciona AND/deny, permissive adiciona OR/allow;
  default-permitir quando so ha abstain.

DI: registrado pelo scanner. Consumido pelos use-cases de `table-rows`.
