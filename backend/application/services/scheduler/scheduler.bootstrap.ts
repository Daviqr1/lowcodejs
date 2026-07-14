import { getInstanceByToken } from 'fastify-decorators';

import { SchedulerMetadataAccessor } from './schedule-metadata.accessor';
import { SchedulerRegistryContractService } from './scheduler-registry-contract.service';
import SchedulerRegistry from './scheduler-registry.service';
import { ScheduleExplorer } from './scheduler.explorer';
import { SchedulerOrchestrator } from './scheduler.orchestrator';

/**
 * Liga a engine de agendamentos no boot (equivale ao `ScheduleModule.forRoot()` +
 * `onApplicationBootstrap` do NestJS): descobre os métodos decorados, monta os
 * jobs e os registra no `SchedulerRegistry`. Deve rodar após `kernel.ready()`,
 * quando todas as classes já foram importadas e são resolvíveis por DI.
 *
 * Retorna o orchestrator para que o shutdown possa chamar `clearAll()`.
 */
export function bootstrapSchedules(): SchedulerOrchestrator {
  const registry =
    getInstanceByToken<SchedulerRegistryContractService>(SchedulerRegistry);
  const orchestrator = new SchedulerOrchestrator(registry);
  const explorer = new ScheduleExplorer(
    orchestrator,
    new SchedulerMetadataAccessor(),
  );

  explorer.explore();
  orchestrator.mountAll();

  return orchestrator;
}
