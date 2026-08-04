import type {
  ExecutionContext,
  FieldDefinition,
  SandboxGlobals,
} from './script-execution.types';

export type BuildSandboxParams = {
  doc: Record<string, unknown>;
  tableSlug: string;
  fields: FieldDefinition[];
  context: ExecutionContext;
  /** Buffer compartilhado: o console interceptado escreve aqui. */
  logs: string[];
};

/**
 * Monta o ambiente exposto ao script do usuario: as APIs `field`, `context`,
 * `email`, `users`, `notify`, `utils`, `console` e a allowlist de builtins.
 * Tudo que toca banco ou rede chega por injecao — nada e instanciado aqui.
 */
export abstract class SandboxBuilderContractService {
  abstract build(params: BuildSandboxParams): SandboxGlobals;
}
