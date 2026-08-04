import type {
  ExecutionError,
  ExecutionResult,
  SandboxGlobals,
} from './script-execution.types';

/**
 * Execucao do codigo do usuario numa VM Node isolada. Sem acesso a require,
 * fs, network ou globals do processo — so o que o sandbox expoe.
 */
export abstract class VmRunnerContractService {
  /** Roda o codigo no contexto do sandbox, com teto de tempo. */
  abstract run(
    code: string,
    sandbox: SandboxGlobals,
    timeout?: number,
  ): Promise<ExecutionResult>;

  /** Compila sem executar. `null` quando a sintaxe esta correta. */
  abstract validateSyntax(code: string): ExecutionError | null;
}
