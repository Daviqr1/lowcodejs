# Services

Servicos para concerns cross-cutting. Mesmo pattern de Contract + Implementation dos repositories.

## Email Service (`email/`)

| Arquivo | Descricao |
|---------|-----------|
| `email-contract.service.ts` | Abstract class: `sendEmail(options)`, `buildTemplate(payload)` |
| `email.service.ts` | Implementacao SMTP via Nodemailer (`NodemailerEmailService`, `export default`). Filtra emails validos, gera versao texto. Em dev retorna testUrl (Ethereal) |
| `in-memory-email.service.ts` | Mock para testes (uso direto raro — preferir `InMemoryEmailQueueService`) |

Registrado no DI **automaticamente** pelo scanner (`email-contract.service.ts` ↔ `email.service.ts`).

**Importante:** Use-cases nao chamam `EmailContractService` diretamente. Eles enfileiram jobs em `EmailQueueContractService` (`email-queue/`). O `EmailWorker` e o unico consumidor de `EmailContractService`.

## Email Queue (`email-queue/`)

Fila BullMQ que desacopla envio de email do fluxo da request. Replica o padrao
de `services/storage-migration/`. Detalhes em `email-queue/CLAUDE.md`.

Impl: `email-queue.service.ts` (`BullMQEmailQueueService`, `export default`).
Registrado no DI automaticamente pelo scanner.

## Storage Service (`storage.service.ts`)

| Metodo | Descricao |
|--------|-----------|
| `upload(part, staticName?)` | Upload de arquivo. Imagens convertidas para WebP 1200x1200. |
| `delete(filename)` | Remove arquivo |
| `exists(filename)` | Verifica existencia |

**Nota:** Ainda nao segue o pattern contract. Candidato a formalizacao futura.

## Field Validation Service (`field-validation/`)

Executa as regras de `field.validations[]` (camada única — `core/validations/`)
no create/update/bulk-update de row, após o `RowPayloadValidator` estrutural.
Async (regras como is-unique consultam o banco). Injeta `RowContractRepository` +
`UserContractRepository`. Detalhes em `field-validation/CLAUDE.md`.

## Scheduler (`scheduler/`)

Engine de agendamentos **in-process** (port 1:1 do `@nestjs/schedule`). Decorators
`@Cron`/`@Interval`/`@Timeout` em métodos de qualquer classe DI-gerenciada,
descobertos no boot. Expõe `SchedulerRegistryContractService` (injetável) para
controle em runtime. Ligado em `bin/server.ts` após `kernel.ready()` (env
`SCHEDULER_ENABLED`). Detalhes e uso em `scheduler/CLAUDE.md`.

## Para Criar Novo Service

1. Crie diretorio `services/{nome}/`
2. Crie `{nome}-contract.service.ts` com abstract class `{Nome}ContractService`
   (export nomeado)
3. Crie `{nome}.service.ts` com `@Service() export default class` da impl
4. Crie `in-memory-{nome}.service.ts` para testes (ignorado pelo scanner)

O `di-registry.ts` registra o par automaticamente pela convencao
`{nome}-contract.service.ts` ↔ `{nome}.service.ts` — **nao precisa editar nada**.
