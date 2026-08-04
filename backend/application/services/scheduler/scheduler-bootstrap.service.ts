import { Service } from 'fastify-decorators';

import { SchedulerMetadataAccessor } from './schedule-metadata.accessor';
import { SchedulerBootstrapContractService } from './scheduler-bootstrap-contract.service';
import { SchedulerRegistryContractService } from './scheduler-registry-contract.service';
import { ScheduleExplorer } from './scheduler.explorer';
import { SchedulerOrchestrator } from './scheduler.orchestrator';

@Service()
export default class SchedulerBootstrapService implements SchedulerBootstrapContractService {
  constructor(private readonly registry: SchedulerRegistryContractService) {}

  bootstrap(): SchedulerOrchestrator {
    // Orchestrator, explorer e metadata accessor sao colaboradores internos
    // deste service, sem estado compartilhado — nao ha o que injetar.
    const orchestrator = new SchedulerOrchestrator(this.registry);
    const explorer = new ScheduleExplorer(
      orchestrator,
      new SchedulerMetadataAccessor(),
    );

    explorer.explore();
    orchestrator.mountAll();

    return orchestrator;
  }
}
