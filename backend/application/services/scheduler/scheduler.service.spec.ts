import { CronJob } from 'cron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Cron } from './decorators/cron.decorator';
import { Interval } from './decorators/interval.decorator';
import { Timeout } from './decorators/timeout.decorator';
import { CronExpression } from './enums/cron-expression.enum';
import { E_SCHEDULER_TYPE } from './enums/scheduler-type.enum';
import { SchedulerMetadataAccessor } from './schedule-metadata.accessor';
import SchedulerRegistry from './scheduler-registry.service';
import {
  SCHEDULER_NAME,
  SCHEDULER_TYPE,
  SCHEDULE_CRON_OPTIONS,
} from './scheduler.constants';
import { schedulerDiscovery } from './scheduler.discovery';
import { ScheduleExplorer } from './scheduler.explorer';
import { SchedulerOrchestrator } from './scheduler.orchestrator';

// Mock do getInstanceByToken (DI): o explorer resolve as classes decoradas por
// aqui. Preservamos o resto do fastify-decorators (o @Service do registry).
const { getInstanceMock, instanceMap } = vi.hoisted(() => {
  const instanceMap = new Map<unknown, unknown>();
  const getInstanceMock = (token: unknown): unknown => instanceMap.get(token);
  return { getInstanceMock, instanceMap };
});

vi.mock('fastify-decorators', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fastify-decorators')>();
  return { ...actual, getInstanceByToken: getInstanceMock };
});

describe('scheduler / decorators', () => {
  it('@Cron grava metadata no método e registra a classe no discovery', () => {
    class CronHost {
      @Cron(CronExpression.EVERY_5_SECONDS, { name: 'job-cron' })
      handle(): void {}
    }

    const method = CronHost.prototype.handle;
    expect(Reflect.getMetadata(SCHEDULER_TYPE, method)).toBe(
      E_SCHEDULER_TYPE.CRON,
    );
    expect(Reflect.getMetadata(SCHEDULER_NAME, method)).toBe('job-cron');
    expect(Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, method)).toMatchObject({
      cronTime: CronExpression.EVERY_5_SECONDS,
      name: 'job-cron',
    });
    expect(schedulerDiscovery.getClasses()).toContain(CronHost);
  });

  it('@Cron aceita Date (one-shot)', () => {
    const when = new Date(Date.now() + 60_000);
    class DateHost {
      @Cron(when)
      handle(): void {}
    }
    expect(
      Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, DateHost.prototype.handle),
    ).toMatchObject({ cronTime: when });
  });

  it('@Interval/@Timeout aceitam (ms) e (nome, ms)', () => {
    class TimerHost {
      @Interval(10_000)
      anon(): void {}

      @Interval('nomeado', 5_000)
      named(): void {}

      @Timeout('umaVez', 3_000)
      once(): void {}
    }

    const accessor = new SchedulerMetadataAccessor();
    expect(accessor.getSchedulerType(TimerHost.prototype.anon)).toBe(
      E_SCHEDULER_TYPE.INTERVAL,
    );
    expect(accessor.getSchedulerName(TimerHost.prototype.anon)).toBeUndefined();
    expect(accessor.getIntervalMetadata(TimerHost.prototype.anon)).toEqual({
      timeout: 10_000,
    });
    expect(accessor.getSchedulerName(TimerHost.prototype.named)).toBe(
      'nomeado',
    );
    expect(accessor.getSchedulerName(TimerHost.prototype.once)).toBe('umaVez');
    expect(accessor.getTimeoutMetadata(TimerHost.prototype.once)).toEqual({
      timeout: 3_000,
    });
  });
});

describe('scheduler / SchedulerRegistry', () => {
  let registry: SchedulerRegistry;

  function fakeCronJob(): CronJob {
    // Mock parcial de CronJob (só o necessário para o registry).
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- mock parcial de lib em spec
    return {
      stop: vi.fn(),
      fireOnTick: vi.fn(() => Promise.resolve()),
    } as unknown as CronJob;
  }

  beforeEach(() => {
    registry = new SchedulerRegistry();
  });

  it('cron: add/get/getAll/doesExist/delete (stop no delete)', () => {
    const job = fakeCronJob();
    registry.addCronJob('c1', job);

    expect(registry.getCronJob('c1')).toBe(job);
    expect(registry.doesExist('cron', 'c1')).toBe(true);
    expect([...registry.getCronJobs().keys()]).toEqual(['c1']);

    registry.deleteCronJob('c1');
    expect(job.stop).toHaveBeenCalledOnce();
    expect(registry.doesExist('cron', 'c1')).toBe(false);
  });

  it('interval: add/get/getAll/delete (clearInterval)', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const handle = setInterval(() => {}, 1_000_000);
    registry.addInterval('i1', handle);

    expect(registry.getInterval('i1')).toBe(handle);
    expect(registry.getIntervals()).toEqual(['i1']);

    registry.deleteInterval('i1');
    expect(clearSpy).toHaveBeenCalledWith(handle);
    expect(registry.doesExist('interval', 'i1')).toBe(false);
    clearSpy.mockRestore();
  });

  it('timeout: add/get/getAll/delete (clearTimeout)', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const handle = setTimeout(() => {}, 1_000_000);
    registry.addTimeout('t1', handle);

    expect(registry.getTimeout('t1')).toBe(handle);
    expect(registry.getTimeouts()).toEqual(['t1']);

    registry.deleteTimeout('t1');
    expect(clearSpy).toHaveBeenCalledWith(handle);
    clearSpy.mockRestore();
  });

  it('lança em nome duplicado e em nome inexistente', () => {
    registry.addCronJob('dup', fakeCronJob());
    expect(() => registry.addCronJob('dup', fakeCronJob())).toThrowError(
      /já existe/i,
    );
    expect(() => registry.getCronJob('nao-existe')).toThrowError(/nenhum/i);
    expect(() => registry.deleteInterval('nao-existe')).toThrowError(/nenhum/i);
  });

  it('addCronJob embrulha fireOnTick em try/catch (não propaga)', async () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- mock parcial de lib em spec
    const job = {
      stop: vi.fn(),
      fireOnTick: vi.fn(() => Promise.reject(new Error('boom'))),
    } as unknown as CronJob;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    registry.addCronJob('wrap', job);
    await expect(
      registry.getCronJob('wrap').fireOnTick(),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('scheduler / SchedulerOrchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mountAll cria e registra cron/interval/timeout', () => {
    const registry = new SchedulerRegistry();
    const orchestrator = new SchedulerOrchestrator(registry);

    orchestrator.addCron(() => {}, {
      cronTime: CronExpression.EVERY_5_SECONDS,
      name: 'cron-a',
    });
    orchestrator.addInterval(() => {}, 1000, 'int-a');
    orchestrator.addTimeout(() => {}, 2000, 'time-a');

    orchestrator.mountAll();

    expect(registry.doesExist('cron', 'cron-a')).toBe(true);
    expect(registry.doesExist('interval', 'int-a')).toBe(true);
    expect(registry.doesExist('timeout', 'time-a')).toBe(true);

    orchestrator.clearAll();
    expect(registry.getIntervals()).toEqual([]);
    expect(registry.getTimeouts()).toEqual([]);
    expect([...registry.getCronJobs().keys()]).toEqual([]);
  });

  it('cron disabled não inicia; initialDelay agenda o start', () => {
    const registry = new SchedulerRegistry();
    const orchestrator = new SchedulerOrchestrator(registry);

    orchestrator.addCron(() => {}, {
      cronTime: CronExpression.EVERY_5_SECONDS,
      name: 'disabled',
      disabled: true,
    });
    orchestrator.addCron(() => {}, {
      cronTime: CronExpression.EVERY_5_SECONDS,
      name: 'delayed',
      initialDelay: 1000,
    });
    orchestrator.mountAll();

    expect(registry.getCronJob('disabled').isActive).toBe(false);
    const delayed = registry.getCronJob('delayed');
    expect(delayed.isActive).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(delayed.isActive).toBe(true);

    orchestrator.clearAll();
  });
});

describe('scheduler / ScheduleExplorer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('descobre métodos decorados, resolve a instância e liga os jobs', () => {
    class ExplorerHost {
      @Cron(CronExpression.EVERY_10_SECONDS, { name: 'explorer-cron' })
      doCron(): void {}

      @Interval('explorer-int', 4000)
      doInterval(): void {}
    }

    instanceMap.set(ExplorerHost, new ExplorerHost());

    const registry = new SchedulerRegistry();
    const orchestrator = new SchedulerOrchestrator(registry);
    const explorer = new ScheduleExplorer(
      orchestrator,
      new SchedulerMetadataAccessor(),
    );

    explorer.explore();
    orchestrator.mountAll();

    expect(registry.doesExist('cron', 'explorer-cron')).toBe(true);
    expect(registry.doesExist('interval', 'explorer-int')).toBe(true);

    orchestrator.clearAll();
  });

  it('exceção dentro do job é capturada (não propaga)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const boom = vi.fn(() => {
      throw new Error('falhou');
    });

    class ThrowingHost {
      @Timeout('explorer-throw', 1000)
      handle(): void {
        boom();
      }
    }

    instanceMap.set(ThrowingHost, new ThrowingHost());

    const orchestrator = new SchedulerOrchestrator(new SchedulerRegistry());
    const explorer = new ScheduleExplorer(
      orchestrator,
      new SchedulerMetadataAccessor(),
    );
    explorer.explore();
    orchestrator.mountAll();

    // Dispara o timeout: o wrapper try/catch do explorer engole a exceção.
    await vi.advanceTimersByTimeAsync(1000);

    expect(boom).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    orchestrator.clearAll();
    errorSpy.mockRestore();
  });
});
