import { Service } from 'fastify-decorators';
import { getInstanceByToken } from 'fastify-decorators';

import type { SchedulerTypeValue } from './enums/scheduler-type.enum';
import { ScheduleExplorerContractService } from './schedule-explorer-contract.service';
import { ScheduleMetadataAccessorContractService } from './schedule-metadata-accessor-contract.service';
import { SchedulerOrchestratorContractService } from './scheduler-orchestrator-contract.service';
import { schedulerDiscovery } from './scheduler.discovery';
import type { ScheduledCommand } from './scheduler.types';

/**
 * Descobre os métodos decorados e os entrega ao orchestrator. Porta de
 * `base-cron/schedule.explorer.ts` — o `DiscoveryService` do NestJS é substituído
 * pelo `SchedulerDiscovery` (classes registradas pelos decorators) + resolução
 * via `getInstanceByToken`. O `switch` da fonte vira lookup object (code-pattern).
 */
@Service()
export default class ScheduleExplorerService implements ScheduleExplorerContractService {
  constructor(
    private readonly orchestrator: SchedulerOrchestratorContractService,
    private readonly metadataAccessor: ScheduleMetadataAccessorContractService,
  ) {}

  explore(): void {
    for (const target of schedulerDiscovery.getClasses()) {
      const instance = this.resolve(target);
      if (!instance) {
        console.warn(
          `[Scheduler] "${target.name || '(anônima)'}" tem método(s) agendado(s) mas não é resolvível por DI (não é um @Service/repository importado no boot — controllers, por exemplo, não são). Jobs ignorados; mova o agendamento para um service.`,
        );
        continue;
      }
      const prototype = Object.getPrototypeOf(instance);
      if (!prototype) continue;

      for (const methodName of this.getMethodNames(prototype)) {
        this.lookupSchedulers(instance, prototype, methodName);
      }
    }
  }

  private lookupSchedulers(
    instance: object,
    prototype: object,
    methodName: string,
  ): void {
    const methodRef = this.getMethod(prototype, methodName);
    if (!methodRef) return;

    const type = this.metadataAccessor.getSchedulerType(methodRef);
    if (!type) return;

    const handlers: Record<SchedulerTypeValue, () => void> = {
      CRON: () => this.registerCron(instance, methodRef),
      TIMEOUT: () => this.registerTimeout(instance, methodRef),
      INTERVAL: () => this.registerInterval(instance, methodRef),
    };
    handlers[type]();
  }

  private registerCron(instance: object, methodRef: ScheduledCommand): void {
    const metadata = this.metadataAccessor.getCronMetadata(methodRef);
    if (!metadata) return;
    this.orchestrator.addCron(
      this.wrapInTryCatch(methodRef, instance),
      metadata,
    );
  }

  private registerTimeout(instance: object, methodRef: ScheduledCommand): void {
    const metadata = this.metadataAccessor.getTimeoutMetadata(methodRef);
    if (!metadata) return;
    const name = this.metadataAccessor.getSchedulerName(methodRef);
    this.orchestrator.addTimeout(
      this.wrapInTryCatch(methodRef, instance),
      metadata.timeout,
      name,
    );
  }

  private registerInterval(
    instance: object,
    methodRef: ScheduledCommand,
  ): void {
    const metadata = this.metadataAccessor.getIntervalMetadata(methodRef);
    if (!metadata) return;
    const name = this.metadataAccessor.getSchedulerName(methodRef);
    this.orchestrator.addInterval(
      this.wrapInTryCatch(methodRef, instance),
      metadata.timeout,
      name,
    );
  }

  private resolve(target: Function): object | undefined {
    // fastify-decorators tipa o token de DI como Constructor; o discovery guarda
    // a classe decorada como Function (a mesma coisa em runtime). Única fronteira
    // de tipagem do módulo.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Function → token (Constructor) do fastify-decorators
    return getInstanceByToken(target as unknown as { new (): object });
  }

  private getMethodNames(prototype: object): string[] {
    return Object.getOwnPropertyNames(prototype).filter((key) => {
      if (key === 'constructor') return false;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
      return typeof descriptor?.value === 'function';
    });
  }

  private getMethod(
    prototype: object,
    methodName: string,
  ): ScheduledCommand | undefined {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
    if (descriptor && typeof descriptor.value === 'function') {
      return descriptor.value;
    }
    return undefined;
  }

  private wrapInTryCatch(
    methodRef: ScheduledCommand,
    instance: object,
  ): ScheduledCommand {
    return async (...args: unknown[]): Promise<void> => {
      try {
        await methodRef.call(instance, ...args);
      } catch (error) {
        console.error('[Scheduler] Erro ao executar job agendado:', error);
      }
    };
  }
}
