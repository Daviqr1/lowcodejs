# Email Queue Service

Fila BullMQ dedicada para envio de email. Use-cases enfileiram jobs (`await
emailQueue.enqueue(...)`); o worker in-process consome a fila, renderiza o
template via `EmailContractService.buildTemplate` e envia via
`EmailContractService.sendEmail`.

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `email-queue-contract.service.ts` | Classe abstrata + `EmailJobPayload` + constantes (`EMAIL_QUEUE_NAME`, `EMAIL_JOB.SEND`) |
| `email-queue.service.ts` | Implementacao BullMQ. `attempts: 3`, backoff exponencial (1s/5s/25s), `removeOnComplete: 100`, `removeOnFail: 500` |
| `in-memory-email-queue.service.ts` | Mock para testes. Armazena jobs num array; expoe `getJobs()`, `getLastJob()`, `clear()`, `simulateError()` |
| `worker.ts` | `startEmailWorker(deps)` cria BullMQ Worker, processa jobs, chama EmailContractService. `concurrency` lido de `Env.EMAIL_WORKER_CONCURRENCY` (default 5) |

## EmailJobPayload

```ts
type EmailJobPayload = {
  template: string;             // ex: 'user-created', 'recovery-code'
  data: Record<string, unknown>; // dados para o template EJS
  to: string[];
  subject: string;
  from?: string;
};
```

## Uso (em use-case)

```ts
constructor(private readonly emailQueue: EmailQueueContractService) {}

await this.emailQueue.enqueue({
  template: 'user-created',
  data: { name, email },
  to: [email],
  subject: 'Sua conta foi criada',
});
```

## Bootstrap

Worker iniciado em `bin/server.ts` apos `startStorageMigrationWorker(...)`:

```ts
const emailService = getInstanceByToken<EmailContractService>(NodemailerEmailService);
startEmailWorker({ emailService });
```

## Resiliencia

- BullMQ retry com 3 tentativas e backoff exponencial cobre falhas SMTP transient.
- Se `sendEmail` retornar `success: false`, o worker lanca erro forcando retry.
- Apos 3 tentativas o job vai para `failed` e fica no Redis (limit 500) para inspecao.
- Crash recovery: jobs persistem no Redis; worker retoma na proxima boot.

## Registro DI

```ts
injectablesHolder.injectService(EmailQueueContractService, BullMQEmailQueueService);
```

## Variavel de ambiente

| Variavel | Default | Range | Descricao |
|----------|---------|-------|-----------|
| EMAIL_WORKER_CONCURRENCY | 5 | 1-50 | Numero de jobs processados em paralelo pelo worker |
