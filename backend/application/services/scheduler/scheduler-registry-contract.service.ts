import type { CronJob } from 'cron';

import type { SchedulerKind, TimerHandle } from './scheduler.types';

/**
 * API pública de gestão de jobs em runtime. Porta de `SchedulerRegistry` do
 * `@nestjs/schedule` (`base-cron/scheduler.registry.ts`). Injetável por qualquer
 * service/resource para criar, consultar e controlar cron/interval/timeout.
 */
export abstract class SchedulerRegistryContractService {
  abstract doesExist(type: SchedulerKind, name: string): boolean;

  abstract getCronJob(name: string): CronJob;
  abstract addCronJob(name: string, job: CronJob): void;
  abstract getCronJobs(): Map<string, CronJob>;
  abstract deleteCronJob(name: string): void;

  abstract getInterval(name: string): TimerHandle;
  abstract addInterval(name: string, intervalId: TimerHandle): void;
  abstract getIntervals(): string[];
  abstract deleteInterval(name: string): void;

  abstract getTimeout(name: string): TimerHandle;
  abstract addTimeout(name: string, timeoutId: TimerHandle): void;
  abstract getTimeouts(): string[];
  abstract deleteTimeout(name: string): void;
}
