import { Service } from 'fastify-decorators';

import { executeScript } from '@application/core/table/handler';
import type { ExecutionResult } from '@application/core/table/types';

import type { ScriptExecutionInput } from './script-execution-contract.service';
import { ScriptExecutionContractService } from './script-execution-contract.service';

@Service()
export default class NodeVmScriptExecutionService implements ScriptExecutionContractService {
  async execute(input: ScriptExecutionInput): Promise<ExecutionResult> {
    return executeScript(input);
  }
}
