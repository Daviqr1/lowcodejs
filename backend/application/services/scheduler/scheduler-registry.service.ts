import type { CronJob } from 'cron';
import { Service } from 'fastify-decorators';

import { SchedulerRegistryContractService } from './scheduler-registry-contract.service';
import { DUPLICATE_SCHEDULER, NO_SCHEDULER_FOUND } from './scheduler.messages';
import type { SchedulerKind, TimerHandle } from './scheduler.types';

/**
 * Implementação do registro de jobs. Porta de `base-cron/scheduler.registry.ts`.
 */
@Service()
export default class SchedulerRegistry implements SchedulerRegistryContractService {
  private readonly cronJobs = new Map<string, CronJob>();
  private readonly intervals = new Map<string, TimerHandle>();
  private readonly timeouts = new Map<string, TimerHandle>();

  doesExist(type: SchedulerKind, name: string): boolean {
    const lookup: Record<SchedulerKind, () => boolean> = {
      cron: () => this.cronJobs.has(name),
      interval: () => this.intervals.has(name),
      timeout: () => this.timeouts.has(name),
    };
    return lookup[type]?.() ?? false;
  }

  getCronJob(name: string): CronJob {
    const ref = this.cronJobs.get(name);
    if (!ref) {
      throw new Error(NO_SCHEDULER_FOUND('agendamento cron', name));
    }
    return ref;
  }

  addCronJob(name: string, job: CronJob): void {
    const ref = this.cronJobs.get(name);
    if (ref) {
      throw new Error(DUPLICATE_SCHEDULER('agendamento cron', name));
    }
    job.fireOnTick = this.wrapInTryCatch(job.fireOnTick, job);
    this.cronJobs.set(name, job);
  }

  getCronJobs(): Map<string, CronJob> {
    return this.cronJobs;
  }

  deleteCronJob(name: string): void {
    const job = this.getCronJob(name);
    job.stop();
    this.cronJobs.delete(name);
  }

  getInterval(name: string): TimerHandle {
    const ref = this.intervals.get(name);
    if (typeof ref === 'undefined') {
      throw new Error(NO_SCHEDULER_FOUND('interval', name));
    }
    return ref;
  }

  addInterval(name: string, intervalId: TimerHandle): void {
    const ref = this.intervals.get(name);
    if (ref) {
      throw new Error(DUPLICATE_SCHEDULER('interval', name));
    }
    this.intervals.set(name, intervalId);
  }

  getIntervals(): string[] {
    return [...this.intervals.keys()];
  }

  deleteInterval(name: string): void {
    const interval = this.getInterval(name);
    clearInterval(interval);
    this.intervals.delete(name);
  }

  getTimeout(name: string): TimerHandle {
    const ref = this.timeouts.get(name);
    if (typeof ref === 'undefined') {
      throw new Error(NO_SCHEDULER_FOUND('timeout', name));
    }
    return ref;
  }

  addTimeout(name: string, timeoutId: TimerHandle): void {
    const ref = this.timeouts.get(name);
    if (ref) {
      throw new Error(DUPLICATE_SCHEDULER('timeout', name));
    }
    this.timeouts.set(name, timeoutId);
  }

  getTimeouts(): string[] {
    return [...this.timeouts.keys()];
  }

  deleteTimeout(name: string): void {
    const timeout = this.getTimeout(name);
    clearTimeout(timeout);
    this.timeouts.delete(name);
  }

  private wrapInTryCatch(
    methodRef: (...args: unknown[]) => unknown,
    instance: object,
  ): (...args: unknown[]) => Promise<void> {
    return async (...args: unknown[]): Promise<void> => {
      try {
        await methodRef.call(instance, ...args);
      } catch (error) {
        console.error('[Scheduler] Erro em job cron:', error);
      }
    };
  }
}
