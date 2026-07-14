import type { SchedulerTypeValue } from './enums/scheduler-type.enum';
import {
  SCHEDULER_NAME,
  SCHEDULER_TYPE,
  SCHEDULE_CRON_OPTIONS,
  SCHEDULE_INTERVAL_OPTIONS,
  SCHEDULE_TIMEOUT_OPTIONS,
} from './scheduler.constants';
import type {
  CronMetadata,
  IntervalMetadata,
  TimeoutMetadata,
} from './scheduler.types';

/**
 * Lê a metadata gravada nos métodos decorados. Porta de
 * `base-cron/schedule-metadata.accessor.ts` — substitui o `Reflector` do NestJS
 * por `reflect-metadata` cru.
 */
export class SchedulerMetadataAccessor {
  getSchedulerType(target: Function): SchedulerTypeValue | undefined {
    return Reflect.getMetadata(SCHEDULER_TYPE, target);
  }

  getSchedulerName(target: Function): string | undefined {
    return Reflect.getMetadata(SCHEDULER_NAME, target);
  }

  getCronMetadata(target: Function): CronMetadata | undefined {
    return Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, target);
  }

  getIntervalMetadata(target: Function): IntervalMetadata | undefined {
    return Reflect.getMetadata(SCHEDULE_INTERVAL_OPTIONS, target);
  }

  getTimeoutMetadata(target: Function): TimeoutMetadata | undefined {
    return Reflect.getMetadata(SCHEDULE_TIMEOUT_OPTIONS, target);
  }
}
