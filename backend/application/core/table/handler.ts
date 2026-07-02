import { execute } from './executor';
import { buildSandbox } from './sandbox';
import type {
  ExecutionContext,
  ExecutionResult,
  FieldDefinition,
} from './types';

export interface ExecuteScriptParams {
  code: string;
  doc: Record<string, unknown>;
  tableSlug: string;
  fields: FieldDefinition[];
  context: ExecutionContext;
  timeout?: number;
}

/**
 * Main entry point for executing user scripts
 *
 * This function orchestrates the entire execution process:
 * 1. Builds the sandbox environment with all APIs
 * 2. Executes the user code in the sandbox
 * 3. Syncs any modified field values back to the document
 * 4. Returns the execution result with logs and errors
 */
export async function executeScript(
  params: ExecuteScriptParams,
): Promise<ExecutionResult> {
  const { code, doc, tableSlug, fields, context, timeout } = params;

  // Empty code is valid (no-op)
  if (!code || code.trim() === '') {
    return { success: true, logs: [] };
  }

  // Array to collect logs during execution
  const logs: string[] = [];

  try {
    // Build the sandbox environment
    const sandbox = buildSandbox({
      doc,
      tableSlug,
      fields,
      context,
      logs,
    });

    // Execute the code
    const result = await execute(code, sandbox, timeout);

    // Merge logs from sandbox
    result.logs = [...logs, ...result.logs];

    return result;
  } catch (error: unknown) {
    console.error('Unexpected error in executeScript:', error);
    let message = 'Erro desconhecido na execução';
    if (error instanceof Error) message = error.message;
    return {
      success: false,
      error: {
        type: 'unknown',
        message,
      },
      logs,
    };
  }
}

/**
 * Convenience export for backwards compatibility
 * Maps the old HandlerFunction signature to the new executeScript
 */
export async function HandlerFunctionAsync(
  code: string,
  doc: Record<string, unknown>,
  slug: string,
  fields: string[],
  context: {
    userAction?:
      | 'novo_registro'
      | 'editar_registro'
      | 'excluir_registro'
      | 'carregamento_formulario';
    executionMoment?:
      | 'carregamento_formulario'
      | 'antes_salvar'
      | 'depois_salvar';
    userId?: string;
  } = {},
): Promise<{ success: boolean; error?: string }> {
  const result = await executeScript({
    code,
    doc,
    tableSlug: slug,
    fields: fields.map((f) => ({ slug: f, type: 'unknown', name: f })),
    context: {
      userAction: context.userAction ?? 'editar_registro',
      executionMoment: context.executionMoment ?? 'antes_salvar',
      userId: context.userId,
      isNew: context.userAction === 'novo_registro',
    },
  });

  if (result.success) {
    return { success: true };
  }

  return {
    success: false,
    error: result.error?.message ?? 'Erro na execução do script',
  };
}
