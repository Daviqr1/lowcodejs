import { CronJob } from 'cron';

import { SchedulerRegistryContractService } from './scheduler-registry-contract.service';
import type {
  CronMetadata,
  ScheduledCommand,
  TimerHandle,
} from './scheduler.types';

type CronDef = {
  target: ScheduledCommand;
  options: CronMetadata;
  ref?: CronJob;
  initialDelayRef?: TimerHandle;
};

type TimerDef = {
  target: ScheduledCommand;
  timeout: number;
  ref?: TimerHandle;
};

/**
 * Coleta as definições descobertas pelo explorer e as monta (cria os jobs `cron`
 * e os `setInterval`/`setTimeout`), registrando cada uma no `SchedulerRegistry`.
 * Porta de `base-cron/scheduler.orchestrator.ts` — os hooks de ciclo de vida do
 * NestJS (`onApplicationBootstrap`/`beforeApplicationShutdown`) viram os métodos
 * públicos `mountAll()`/`clearAll()`, chamados no boot/shutdown pelo bootstrap.
 */
export class SchedulerOrchestrator {
  private readonly cronJobs: Record<string, CronDef> = {};
  private readonly timeouts: Record<string, TimerDef> = {};
  private readonly intervals: Record<string, TimerDef> = {};

  constructor(private readonly registry: SchedulerRegistryContractService) {}

  mountAll(): void {
    this.mountTimeouts();
    this.mountIntervals();
    this.mountCron();
  }

  clearAll(): void {
    this.clearTimeouts();
    this.clearIntervals();
    this.closeCronJobs();
  }

  addTimeout(
    methodRef: ScheduledCommand,
    timeout: number,
    name: string = crypto.randomUUID(),
  ): void {
    this.timeouts[name] = { target: methodRef, timeout };
  }

  addInterval(
    methodRef: ScheduledCommand,
    timeout: number,
    name: string = crypto.randomUUID(),
  ): void {
    this.intervals[name] = { target: methodRef, timeout };
  }

  addCron(methodRef: ScheduledCommand, options: CronMetadata): void {
    const name = options.name ?? crypto.randomUUID();
    this.cronJobs[name] = { target: methodRef, options };
  }

  private mountTimeouts(): void {
    for (const [key, def] of Object.entries(this.timeouts)) {
      const ref = setTimeout(def.target, def.timeout);
      def.ref = ref;
      this.registry.addTimeout(key, ref);
    }
  }

  private mountIntervals(): void {
    for (const [key, def] of Object.entries(this.intervals)) {
      const ref = setInterval(def.target, def.timeout);
      def.ref = ref;
      this.registry.addInterval(key, ref);
    }
  }

  private mountCron(): void {
    for (const [key, def] of Object.entries(this.cronJobs)) {
      const { options, target } = def;
      const cronJob = CronJob.from({
        ...options,
        onTick: target,
        start: !options.disabled && !options.initialDelay,
      });

      def.ref = cronJob;
      this.registry.addCronJob(key, cronJob);

      if (
        options.initialDelay &&
        options.initialDelay > 0 &&
        !options.disabled
      ) {
        def.initialDelayRef = setTimeout(() => {
          if (this.registry.doesExist('cron', key)) {
            cronJob.start();
          }
        }, options.initialDelay);
      }
    }
  }

  private clearTimeouts(): void {
    for (const key of this.registry.getTimeouts()) {
      this.registry.deleteTimeout(key);
    }
  }

  private clearIntervals(): void {
    for (const key of this.registry.getIntervals()) {
      this.registry.deleteInterval(key);
    }
  }

  private closeCronJobs(): void {
    for (const def of Object.values(this.cronJobs)) {
      if (def.initialDelayRef !== undefined) {
        clearTimeout(def.initialDelayRef);
      }
    }
    for (const key of [...this.registry.getCronJobs().keys()]) {
      this.registry.deleteCronJob(key);
    }
  }
}
