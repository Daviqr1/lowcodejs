# Logger Repository

Repositorio da entidade Logger (trilha de auditoria de acoes no sistema).
Alimenta o recurso `/logs`.

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `logger-contract.repository.ts` | Classe abstrata + payload types |
| `logger.repository.ts` | Implementacao com Mongoose |

> Sem `in-memory`: os logs sao verificados via e2e (MongoDB real).

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `create(payload)` | `ILogger` | Registra uma entrada de log |
| `update(payload)` | `ILogger` | Atualiza uma entrada por _id |
| `findById(_id, options?)` | `ILogger \| null` | Busca por _id |
| `findMany(payload?)` | `ILogger[]` | Query com paginacao, busca, filtros por action/object/user/data |
| `count(payload?)` | `number` | Conta entradas matchando a query |

## Payloads

- `LoggerCreatePayload` - action, content, url, object, object_id, user_id + auditoria do registro referenciado (creator/updater/objectCreatedAt/objectUpdatedAt, opcionais — so quando o objeto e uma ROW)
- `LoggerQueryPayload` - page, perPage, search, user_id, actions[], objects[], dateFrom, dateTo, sort

## Comportamentos Unicos

- Os campos `creator`/`updater`/`objectCreatedAt`/`objectUpdatedAt` descrevem o
  **registro referenciado** (nao o log). Resolvidos por
  `core/logger/resolve-object-audit.ts` (dual-connection) no hook e no backfill
- Sem soft delete no fluxo padrao (logs sao append-only)
