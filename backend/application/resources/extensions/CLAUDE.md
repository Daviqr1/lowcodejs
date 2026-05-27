# Extensions (REST)

Recurso REST para gerenciar extensões registradas no DB. **Apenas administra**
o registry — não executa as extensões em si (isso fica no loader, slots e
rotas dinâmicas).

## Base Route

`/extensions`

## Operações

| Operação | Método | Rota | Permissão |
|----------|--------|------|-----------|
| list | GET | `/extensions` | MASTER |
| toggle | PATCH | `/extensions/:_id/toggle` | MASTER |
| configure-table-scope | PATCH | `/extensions/:_id/table-scope` | MASTER |
| configure-table-settings | PATCH | `/extensions/:_id/table-settings/:tableId` | MASTER |
| bulk-configure-table-settings | PATCH | `/extensions/:_id/bulk-table-settings` | MASTER |

## Middlewares

1. `AuthenticationMiddleware({ optional: false })`
2. `RoleMiddleware([E_ROLE.MASTER])`

## Repositórios utilizados

- `ExtensionContractRepository` — CRUD do registry

## Comportamentos chave

- **list** retorna todas as extensões (incluindo `enabled: false` e
  `available: false`) para o Workshop
- **toggle** rejeita habilitar uma extensão `available: false` (o manifesto
  sumiu do disco) com `EXTENSION_UNAVAILABLE`
- **configure-table-scope** só aceita extensões do tipo `PLUGIN` —
  `TABLE_SCOPE_NOT_APPLICABLE` em outros tipos. Quando `mode=specific`, exige
  ao menos um tableId. Em novos bindings, chama `guard.onTableBound(table, guard.defaultSettings ?? {})` —
  para guards com `settingsSchema` exigente (`row-access`), os defaults vêm do plugin.
- **configure-table-settings** persiste settings para UMA tabela com
  optimistic lock via `expectedUpdatedAt`. Re-valida via `onTableBound`. Retorna
  409 em conflito.
- **bulk-configure-table-settings** aplica a MESMA settings em **N tabelas**
  (até 50). Para cada tabela: chama `onTableBound`; sucessos viram entries
  `tableSettings[tableId]`, falhas viram `failed[]`. Une `tableIds` ao
  `tableScope`. Optimistic lock GLOBAL na extension. Resposta:
  `{ extension, success: [], failed: [] }`. Usado pelo `<RowAccessConfigSheet>` no frontend.

## Observações

- Não há endpoint `create` ou `delete`: o registry é populado exclusivamente
  pelo loader no boot, lendo `backend/extensions/`
- O campo `available` é mantido pelo loader (não pelos endpoints): manifestos
  removidos do disco viram `available: false` no próximo boot
