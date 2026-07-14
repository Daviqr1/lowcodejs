import { E_SCHEDULER_TYPE } from '../enums/scheduler-type.enum';
import {
  SCHEDULE_INTERVAL_OPTIONS,
  SCHEDULER_NAME,
  SCHEDULER_TYPE,
} from '../scheduler.constants';
import { schedulerDiscovery } from '../scheduler.discovery';
import type { SchedulerMethodDecorator } from '../scheduler.types';

/**
 * Agenda um interval (`setInterval`). Aceita `@Interval(ms)` ou
 * `@Interval(nome, ms)`. Porta de `base-cron/decorators/interval.decorator.ts`
 * (os overloads da fonte foram unificados numa assinatura só por conta do
 * `no-redeclare` do ESLint).
 */
export function Interval(
  nameOrTimeout: string | number,
  timeout?: number,
): SchedulerMethodDecorator {
  let name: string | undefined = undefined;
  let intervalTimeout = nameOrTimeout;
  if (typeof nameOrTimeout === 'string') {
    name = nameOrTimeout;
    intervalTimeout = timeout ?? 0;
  }

  return function (target, _propertyKey, descriptor): void {
    const method = descriptor.value;
    Reflect.defineMetadata(
      SCHEDULE_INTERVAL_OPTIONS,
      { timeout: intervalTimeout },
      method,
    );
    Reflect.defineMetadata(SCHEDULER_NAME, name, method);
    Reflect.defineMetadata(SCHEDULER_TYPE, E_SCHEDULER_TYPE.INTERVAL, method);
    schedulerDiscovery.register(target.constructor);
  };
}
