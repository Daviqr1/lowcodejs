import type { CronJobParams } from 'cron';

import type { Merge } from '@application/core/entity.core';

/**
 * Tipos do módulo scheduler. Porta de `base-cron` (cron.decorator + interfaces),
 * adaptado ao code-pattern (`Merge` no lugar de `&`, `type` no lugar de `interface`).
 */

/** Entrada aceita por `@Cron`: expressão cron, `Date` (one-shot) ou Luxon DateTime. */
export type CronTimeInput = CronJobParams['cronTime'];

type CronOptionsBase = {
  /** Nome do job — permite recuperá-lo/controlá-lo pela API do `SchedulerRegistry`. */
  name?: string;
  /**
   * Se `true`, cron roda como se precisasse controlar o event loop. Ver
   * `timers#unref` nos docs do Node.
   */
  unrefTimeout?: boolean;
  /**
   * Se `true`, nenhuma nova execução roda enquanto o `onTick` atual não terminar.
   * Execuções agendadas nesse meio-tempo são puladas.
   */
  waitForCompletion?: boolean;
  /** Indica se o job será executado. @default false */
  disabled?: boolean;
  /** Threshold (ms) para executar/pular deadlines perdidos por hardware lento. @default 250 */
  threshold?: number;
  /**
   * Atraso (ms) antes da primeira execução após o boot. As execuções seguintes
   * seguem o schedule normal. Útil quando o job depende de recursos ainda não
   * prontos no startup.
   */
  initialDelay?: number;
};

type WithTimeZone = { timeZone?: string; utcOffset?: never };
type WithUtcOffset = { timeZone?: never; utcOffset?: number };

/** Opções do `@Cron` (timeZone e utcOffset mutuamente exclusivos). */
export type CronOptions =
  | Merge<CronOptionsBase, WithTimeZone>
  | Merge<CronOptionsBase, WithUtcOffset>;

/** Metadata gravada pelo `@Cron` no método (opções + `cronTime`). */
export type CronMetadata =
  | Merge<Merge<CronOptionsBase, WithTimeZone>, { cronTime: CronTimeInput }>
  | Merge<Merge<CronOptionsBase, WithUtcOffset>, { cronTime: CronTimeInput }>;

/** Metadata gravada por `@Interval`/`@Timeout`. */
export type IntervalMetadata = { timeout: number };
export type TimeoutMetadata = { timeout: number };

/** Assinatura dos method decorators do módulo (grava metadata, não altera o método). */
export type SchedulerMethodDecorator = (
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) => void;

/** Handle retornado por `setInterval`/`setTimeout` (NodeJS.Timeout). */
export type TimerHandle = ReturnType<typeof setTimeout>;

/** Callback de um job (método decorado), já embrulhado em try/catch pelo explorer. */
export type ScheduledCommand = (...args: unknown[]) => void | Promise<void>;

/** Discriminante usado por `SchedulerRegistry.doesExist`. */
export type SchedulerKind = 'cron' | 'interval' | 'timeout';
