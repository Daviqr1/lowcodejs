# Storage Migration

Migra os arquivos entre drivers de storage (local ↔ s3) quando o MASTER troca o
`STORAGE_DRIVER` na UI. Copia em background com zero downtime. Ver
`backend/CLAUDE.md` § Storage / Migração.

## Base Route

`/storage/migration`

## Operacoes

| Operacao | Metodo | Rota | Permissao |
|----------|--------|------|-----------|
| status | GET | `/storage/migration/status` | MASTER |
| start | POST | `/storage/migration/start` | MASTER |
| cleanup | POST | `/storage/migration/cleanup` | MASTER |

## Middlewares

`AuthenticationMiddleware({ optional: false })` + `RoleMiddleware([E_ROLE.MASTER])`
em todas.

## Arquitetura

- Fila BullMQ (Redis) + worker in-process (iniciado em `bin/server.ts`).
- Progresso em tempo real via Socket.IO namespace `/storage-migration`
  (`progress`, `file_migrated`, `file_failed`, `completed`, `error`).
- Docs Storage ganham `location` + `migration_status`; sweeper de boot recupera
  jobs orfaos apos crash.
