# Extension Repository

Repositorio da entidade Extension (registro de plugins/modules/tools no DB).
Alimentado pelo loader (`core/extensions/loader.ts`) e pelo recurso
`/extensions`.

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `extension-contract.repository.ts` | Classe abstrata + payload types |
| `extension.repository.ts` | Implementacao com Mongoose |
| `extension-in-memory.repository.ts` | Implementacao em memoria para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `findById(_id)` | `IExtension \| null` | Busca por _id |
| `findByKey(pkg, type, extensionId)` | `IExtension \| null` | Busca pela chave unica (usada pelo `ExtensionActiveMiddleware`) |
| `findMany(payload?)` | `IExtension[]` | Query por type/enabled/slot/available |
| `upsert(payload, options?)` | `IExtension` | Cria/atualiza por chave. `enabledOnInsert` liga so na criacao (pacote `core`) |
| `toggleEnabled({ _id, enabled })` | `IExtension` | Liga/desliga (toggle do MASTER) |
| `updateTableScope({ _id, tableScope })` | `IExtension` | Define escopo de tabelas (`all` / `specific`) |
| `updateTableSettings({ _id, tableId, settings })` | `IExtension` | Persiste `tableSettings[tableId]` (row-access-guard) |
| `markUnavailableExcept(presentKeys)` | `number` | Marca `available: false` o que sumiu do disco (loader) |
| `findActiveForTable(tableId)` | `IExtension[]` | Extensoes enabled+available cujo escopo cobre a tabela (RowAccessGuardService) |

## Payloads

- `ExtensionUpsertPayload` - pkg, type, extensionId, metadados do manifest (name, version, slots, route, requires, permissions, manifestSnapshot, ...)
- `ExtensionQueryPayload` - type, enabled, slot (presenca no array `slots`), available
- `ExtensionAvailabilityKey` - `{ pkg, type, extensionId }` (chave unica)

## Comportamentos Unicos

- Chave unica `(pkg, type, extensionId)` — `findByKey`/`upsert` operam por ela, nao por _id
- `upsert` com `enabledOnInsert` preserva o toggle do MASTER em reboots
- `markUnavailableExcept` reconcilia o DB com os manifestos presentes no FS
