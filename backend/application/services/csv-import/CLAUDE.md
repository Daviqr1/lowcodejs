# CSV Import Service

Fila BullMQ + worker para importar rows a partir de um CSV em background
(desacopla do request). Espelha o padrao de `storage-migration`/`email-queue`.
Consumido pelo recurso `table-rows/import-csv`.

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `csv-import-queue-contract.service.ts` | Abstract class + tipos (`CsvImportJobPayload`, `CSV_IMPORT_JOB`, `CSV_IMPORT_QUEUE_NAME`) |
| `csv-import-queue.service.ts` | Impl BullMQ (`@Service() export default`). `enqueue(payload)`, `close()` |
| `in-memory-csv-import-queue.service.ts` | Mock para testes |
| `worker.ts` | Worker in-process (iniciado em `bin/server.ts`). Processa o CSV em batches; teto `IMPORT_CSV_LIMIT` (10.000 linhas). Emite progresso via socket |
| `relationship-resolver.ts` | `buildRelationshipResolvers(...)` — resolve colunas RELATIONSHIP/USER do CSV (valor textual → id) durante o import |

## Contrato

```typescript
enqueue(payload: CsvImportJobPayload): Promise<string>  // job id
close(): Promise<void>
```

## Comportamento Chave

- Import assincrono: o endpoint enfileira e retorna; o worker processa.
- `relationship-resolver` mapeia valores humanos das colunas relacionais para os
  ids reais (lookup por label/slug).
- Cap de 10.000 linhas por import (`IMPORT_CSV_LIMIT`).

DI: registrado pelo scanner (`csv-import-queue-contract.service.ts` ↔
`csv-import-queue.service.ts`).
