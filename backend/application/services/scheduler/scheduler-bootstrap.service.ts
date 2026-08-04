import { Service } from 'fastify-decorators';

import { ScheduleExplorerContractService } from './schedule-explorer-contract.service';
import { SchedulerBootstrapContractService } from './scheduler-bootstrap-contract.service';
import { SchedulerOrchestratorContractService } from './scheduler-orchestrator-contract.service';

@Service()
export default class SchedulerBootstrapService implements SchedulerBootstrapContractService {
  constructor(
    private readonly explorer: ScheduleExplorerContractService,
    private readonly orchestrator: SchedulerOrchestratorContractService,
  ) {}

  bootstrap(): SchedulerOrchestratorContractService {
    this.explorer.explore();
    this.orchestrator.mountAll();
    return this.orchestrator;
  }
}
