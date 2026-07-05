import type {
  ExecutionContext,
  ExecutionResult,
  FieldDefinition,
} from '@application/core/table/types';

export type ScriptExecutionInput = {
  code: string;
  doc: Record<string, unknown>;
  tableSlug: string;
  fields: FieldDefinition[];
  context: ExecutionContext;
};

export abstract class ScriptExecutionContractService {
  abstract execute(input: ScriptExecutionInput): Promise<ExecutionResult>;
}
