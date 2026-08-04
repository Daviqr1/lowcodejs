import type { SchedulerTypeValue } from './enums/scheduler-type.enum';
import type {
  CronMetadata,
  IntervalMetadata,
  TimeoutMetadata,
} from './scheduler.types';

/** Leitura dos metadados que os decorators `@Cron`/`@Interval`/`@Timeout` gravam. */
export abstract class ScheduleMetadataAccessorContractService {
  abstract getSchedulerType(target: Function): SchedulerTypeValue | undefined;
  abstract getSchedulerName(target: Function): string | undefined;
  abstract getCronMetadata(target: Function): CronMetadata | undefined;
  abstract getIntervalMetadata(target: Function): IntervalMetadata | undefined;
  abstract getTimeoutMetadata(target: Function): TimeoutMetadata | undefined;
}
