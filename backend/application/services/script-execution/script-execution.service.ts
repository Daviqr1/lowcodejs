import { Service } from 'fastify-decorators';

import { SandboxBuilderContractService } from './sandbox-builder-contract.service';
import type { ScriptExecutionInput } from './script-execution-contract.service';
import { ScriptExecutionContractService } from './script-execution-contract.service';
import type { ExecutionResult } from './script-execution.types';
import { VmRunnerContractService } from './vm-runner-contract.service';

@Service()
export default class NodeVmScriptExecutionService implements ScriptExecutionContractService {
  constructor(
    private readonly sandboxBuilder: SandboxBuilderContractService,
    private readonly vmRunner: VmRunnerContractService,
  ) {}

  async execute(input: ScriptExecutionInput): Promise<ExecutionResult> {
    const { code, doc, tableSlug, fields, context, timeout } = input;

    // Codigo vazio e valido (no-op).
    if (!code || code.trim() === '') return { success: true, logs: [] };

    // Buffer compartilhado com o console interceptado do sandbox.
    const logs: string[] = [];

    try {
      const sandbox = this.sandboxBuilder.build({
        doc,
        tableSlug,
        fields,
        context,
        logs,
      });

      const result = await this.vmRunner.run(code, sandbox, timeout);
      result.logs = [...logs, ...result.logs];

      return result;
    } catch (error: unknown) {
      console.error('[script-execution][error]:', error);
      let message = 'Erro desconhecido na execução';
      if (error instanceof Error) message = error.message;
      return { success: false, error: { type: 'unknown', message }, logs };
    }
  }
}
