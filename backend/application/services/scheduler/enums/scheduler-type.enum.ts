import type { ValueOf } from '@application/core/entity.core';

/**
 * Tipo de agendamento marcado num método decorado. Porta do enum `SchedulerType`
 * de `base-cron/enums/scheduler-type.enum.ts`, como const object (estilo do
 * projeto — code-pattern não usa `enum` TS).
 */
export const E_SCHEDULER_TYPE = {
  CRON: 'CRON',
  TIMEOUT: 'TIMEOUT',
  INTERVAL: 'INTERVAL',
} as const;

export type SchedulerTypeValue = ValueOf<typeof E_SCHEDULER_TYPE>;
