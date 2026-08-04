import type {
  ExecutionContext,
  ExecutionResult,
  FieldDefinition,
} from './script-execution.types';

export type ScriptExecutionInput = {
  code: string;
  doc: Record<string, unknown>;
  tableSlug: string;
  fields: FieldDefinition[];
  context: ExecutionContext;
  /** Teto de tempo da execucao; o runner aplica o default de 5s. */
  timeout?: number;
};

export abstract class ScriptExecutionContractService {
  abstract execute(input: ScriptExecutionInput): Promise<ExecutionResult>;
}
