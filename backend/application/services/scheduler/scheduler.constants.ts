/**
 * Chaves de metadata gravadas nos métodos decorados (via `Reflect.defineMetadata`)
 * e lidas pelo `SchedulerMetadataAccessor`. Porta de `base-cron/schedule.constants.ts`.
 */
export const SCHEDULER_NAME = 'SCHEDULER_NAME';
export const SCHEDULER_TYPE = 'SCHEDULER_TYPE';

export const SCHEDULE_CRON_OPTIONS = 'SCHEDULE_CRON_OPTIONS';
export const SCHEDULE_INTERVAL_OPTIONS = 'SCHEDULE_INTERVAL_OPTIONS';
export const SCHEDULE_TIMEOUT_OPTIONS = 'SCHEDULE_TIMEOUT_OPTIONS';
