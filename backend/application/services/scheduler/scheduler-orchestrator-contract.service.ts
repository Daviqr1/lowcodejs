import type { CronMetadata, ScheduledCommand } from './scheduler.types';

/** Acumula os jobs descobertos e os monta/desmonta no registry. */
export abstract class SchedulerOrchestratorContractService {
  abstract mountAll(): void;
  abstract clearAll(): void;
  abstract addTimeout(
    methodRef: ScheduledCommand,
    timeout: number,
    name?: string,
  ): void;
  abstract addInterval(
    methodRef: ScheduledCommand,
    timeout: number,
    name?: string,
  ): void;
  abstract addCron(methodRef: ScheduledCommand, options: CronMetadata): void;
}
