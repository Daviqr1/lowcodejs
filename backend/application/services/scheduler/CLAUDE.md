# Scheduler — Agendamentos por Decorators

Engine de agendamento **in-process** (sem cron externo), port 1:1 do
`@nestjs/schedule`. Fonte de referência: `/home/jhollyfer/Desktop/lowcodejs/base-cron/`.

Permite anotar métodos de **qualquer classe DI-gerenciada** (service, repository
ou controller/resource) com `@Cron`/`@Interval`/`@Timeout`. Os jobs rodam dentro
do processo do backend, iniciados no boot após `kernel.ready()`.

## Uso

```ts
import { Service } from 'fastify-decorators';
import { Cron } from '@application/services/scheduler/decorators/cron.decorator';
import { Interval } from '@application/services/scheduler/decorators/interval.decorator';
import { Timeout } from '@application/services/scheduler/decorators/timeout.decorator';
import { CronExpression } from '@application/services/scheduler/enums/cron-expression.enum';

@Service()
export default class RelatorioService {
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'relatorio-diario' })
  async gerarRelatorio(): Promise<void> {
    // roda todo dia às 3h
  }

  @Interval(10_000)
  ping(): void {
    // roda a cada 10s
  }

  @Timeout(5_000)
  aquecerCache(): void {
    // roda uma vez, 5s após o boot
  }
}
```

`@Cron` aceita expressão cron (string), um valor de `CronExpression` ou um `Date`
(dispara uma vez). Opções: `name`, `timeZone`, `utcOffset`, `waitForCompletion`,
`disabled`, `unrefTimeout`, `threshold`, `initialDelay` (paridade NestJS).
`@Interval`/`@Timeout` aceitam `(ms)` ou `(nome, ms)`.

Exceções lançadas dentro de um job são capturadas e logadas — nunca derrubam o
processo.

## API dinâmica (`SchedulerRegistry`)

Injete `SchedulerRegistryContractService` para criar/controlar jobs em runtime
(igual ao `SchedulerRegistry` do NestJS):

```ts
constructor(private readonly scheduler: SchedulerRegistryContractService) {}

// ...
const job = this.scheduler.getCronJob('relatorio-diario');
job.stop();
console.log(job.nextDate().toISO());
```

Métodos: `getCronJob/addCronJob/getCronJobs/deleteCronJob`,
`getInterval/addInterval/getIntervals/deleteInterval`,
`getTimeout/addTimeout/getTimeouts/deleteTimeout`, `doesExist(type, name)`.

## Arquitetura (port do base-cron)

| Arquivo | Papel | Fonte |
|---------|-------|-------|
| `decorators/{cron,interval,timeout}.decorator.ts` | Gravam metadata no método (`Reflect.defineMetadata`) e registram a classe no discovery. **Funções** (decorator é função). | `base-cron/decorators/*` |
| `enums/scheduler-type.enum.ts` (`E_SCHEDULER_TYPE`) | Tipo do agendamento (const object). | `enums/scheduler-type.enum.ts` |
| `enums/cron-expression.enum.ts` (`CronExpression`) | Expressões cron prontas (const object). | `enums/cron-expression.enum.ts` |
| `scheduler.constants.ts` | Chaves de metadata. | `schedule.constants.ts` |
| `scheduler.messages.ts` | Mensagens de erro (PT-BR). **Funções**. | `schedule.messages.ts` |
| `scheduler.types.ts` | Tipos (`CronOptions`, metadatas, `TimerHandle`, `ScheduledCommand`). | interfaces + cron.decorator |
| `schedule-metadata.accessor.ts` (**classe**) | Lê a metadata (`Reflect.getMetadata`). | `schedule-metadata.accessor.ts` |
| `scheduler.discovery.ts` (**classe** + singleton) | Substitui o `DiscoveryService` do Nest: acumula as classes com método decorado. | (adição — Nest usa `@nestjs/core`) |
| `scheduler.orchestrator.ts` (**classe**) | Coleta as defs e monta/limpa os jobs (`CronJob.from` + `setInterval`/`setTimeout`). | `scheduler.orchestrator.ts` |
| `scheduler.explorer.ts` (**classe**) | Descobre os métodos decorados e entrega ao orchestrator (try/catch automático). | `schedule.explorer.ts` |
| `scheduler-registry-contract.service.ts` + `scheduler-registry.service.ts` (**classe**, `@Service`) | API pública injetável. | `scheduler.registry.ts` |
| `scheduler.bootstrap.ts` | `bootstrapSchedules()` — liga tudo no boot. **Função** (padrão `start*Worker`). | `schedule.module.ts` (`forRoot`) |

## Boot / ciclo de vida

`bootstrapSchedules()` roda em `bin/server.ts` após `kernel.ready()` (equivale ao
`onApplicationBootstrap` do Nest — todas as classes já importadas por
`di-registry` + `loadControllers`, logo resolvíveis por `getInstanceByToken`).
Limpeza via hook `onClose` do kernel (`orchestrator.clearAll()`). Controlado pela
env `SCHEDULER_ENABLED` (default `true`).

## Restrições / limitações

- **A classe do método decorado precisa ser DI-gerenciada** (service/repository/
  controller) — é como o boot a importa e o `getInstanceByToken` a resolve.
  Equivale ao "must be a provider" do NestJS.
- **In-process, sem persistência**: reinicia do zero a cada restart e **não é
  multi-instância-safe** (cada instância dispara seus próprios timers). Para cron
  persistente/distribuído, ver o plano BullMQ em `jolly-wishing-clover.md`.
