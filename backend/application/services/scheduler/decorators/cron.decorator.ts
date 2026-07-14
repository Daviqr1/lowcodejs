import { E_SCHEDULER_TYPE } from '../enums/scheduler-type.enum';
import {
  SCHEDULE_CRON_OPTIONS,
  SCHEDULER_NAME,
  SCHEDULER_TYPE,
} from '../scheduler.constants';
import { schedulerDiscovery } from '../scheduler.discovery';
import type {
  CronOptions,
  CronTimeInput,
  SchedulerMethodDecorator,
} from '../scheduler.types';

/**
 * Agenda um job cron. Porta de `base-cron/decorators/cron.decorator.ts`.
 *
 * @param cronTime Momento do disparo: expressão cron, `Date` (dispara uma vez)
 *   ou Luxon `DateTime`.
 * @param options Opções de execução do job.
 */
export function Cron(
  cronTime: CronTimeInput,
  options: CronOptions = {},
): SchedulerMethodDecorator {
  return function (target, _propertyKey, descriptor): void {
    const method = descriptor.value;
    Reflect.defineMetadata(
      SCHEDULE_CRON_OPTIONS,
      { ...options, cronTime },
      method,
    );
    Reflect.defineMetadata(SCHEDULER_NAME, options.name, method);
    Reflect.defineMetadata(SCHEDULER_TYPE, E_SCHEDULER_TYPE.CRON, method);
    schedulerDiscovery.register(target.constructor);
  };
}
