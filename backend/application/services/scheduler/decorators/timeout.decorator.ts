import { E_SCHEDULER_TYPE } from '../enums/scheduler-type.enum';
import {
  SCHEDULE_TIMEOUT_OPTIONS,
  SCHEDULER_NAME,
  SCHEDULER_TYPE,
} from '../scheduler.constants';
import { schedulerDiscovery } from '../scheduler.discovery';
import type { SchedulerMethodDecorator } from '../scheduler.types';

/**
 * Agenda um timeout (`setTimeout`). Aceita `@Timeout(ms)` ou
 * `@Timeout(nome, ms)`. Porta de `base-cron/decorators/timeout.decorator.ts`
 * (os overloads da fonte foram unificados numa assinatura só por conta do
 * `no-redeclare` do ESLint).
 */
export function Timeout(
  nameOrTimeout: string | number,
  timeout?: number,
): SchedulerMethodDecorator {
  let name: string | undefined = undefined;
  let timeoutValue = nameOrTimeout;
  if (typeof nameOrTimeout === 'string') {
    name = nameOrTimeout;
    timeoutValue = timeout ?? 0;
  }

  return function (target, _propertyKey, descriptor): void {
    const method = descriptor.value;
    Reflect.defineMetadata(
      SCHEDULE_TIMEOUT_OPTIONS,
      { timeout: timeoutValue },
      method,
    );
    Reflect.defineMetadata(SCHEDULER_NAME, name, method);
    Reflect.defineMetadata(SCHEDULER_TYPE, E_SCHEDULER_TYPE.TIMEOUT, method);
    schedulerDiscovery.register(target.constructor);
  };
}
