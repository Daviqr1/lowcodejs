import type { ExecutionResult } from '@application/core/table/types';

import type { ScriptExecutionInput } from './script-execution-contract.service';
import { ScriptExecutionContractService } from './script-execution-contract.service';

export default class InMemoryScriptExecutionService extends ScriptExecutionContractService {
  private _forcedErrors = new Map<string, Error>();

  simulateError(method: string, error: Error): void {
    this._forcedErrors.set(method, error);
  }

  async execute(_input: ScriptExecutionInput): Promise<ExecutionResult> {
    const err = this._forcedErrors.get('execute');
    if (err) {
      this._forcedErrors.delete('execute');
      throw err;
    }
    return { success: true, logs: [] };
  }
}
