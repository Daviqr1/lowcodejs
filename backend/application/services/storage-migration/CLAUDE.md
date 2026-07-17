# Storage Migration Service

Fila BullMQ + worker para migrar arquivos entre drivers de storage
(local <-> s3) sem downtime. Acionado quando o MASTER troca o
`STORAGE_DRIVER` em `/settings`.

Visao geral em `backend/CLAUDE.md` -> "Migracao de arquivos entre drivers".

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `storage-migration-queue-contract.service.ts` | Abstract class + tipos de payload (`MigrateJobPayload`, `CleanupJobPayload`, `ActiveJobInfo`) |
| `storage-migration-queue.service.ts` | Implementacao via BullMQ (Redis). Fila com nome `storage-migration` (constante exportada `STORAGE_MIGRATION_QUEUE_NAME`). |
| `in-memory-storage-migration-queue.service.ts` | Mock para testes |
| `worker.ts` | Worker in-process iniciado por `bin/server.ts`. Consome jobs `migrate` e `cleanup`, emite eventos via Socket.IO no namespace `/storage-migration`. |

## Contrato

```typescript
enqueueMigration(payload: MigrateJobPayload): Promise<string>  // job id
enqueueCleanup(payload: CleanupJobPayload): Promise<string>
getActiveJob(): Promise<ActiveJobInfo | null>
close(): Promise<void>
```

Job names (constante `STORAGE_MIGRATION_JOB`):
- `MIGRATE = 'migrate'` — copia arquivos do `source_driver` para o
  `target_driver`.
- `CLEANUP = 'cleanup'` — apaga arquivos do `driver_to_clear` apos confirmacao.

## Resiliencia

- Persistido no Redis via BullMQ — restart do worker retoma de onde parou.
- Worker pula docs com `location === target_driver` (idempotente).
- Sweeper de boot marca docs `in_progress` orfaos como `failed` quando nao
  ha job ativo (recovery pos-crash).
- 3 tentativas com backoff linear; falhas marcam `migration_status='failed'`
  (retentadas via `start` com `retry_failed_only: true`).

## Concorrencia

`STORAGE_MIGRATION_CONCURRENCY` (env, default 5, range 1-20) controla
quantos arquivos copiados em paralelo por job.

## Endpoints (resource `storage-migration`)

| Endpoint | Metodo | Role |
|----------|--------|------|
| `/storage/migration/status` | GET | MASTER |
| `/storage/migration/start` | POST | MASTER |
| `/storage/migration/cleanup` | POST | MASTER |

DI: `injectablesHolder.injectService(StorageMigrationQueueContractService, BullMQStorageMigrationQueueService)`
