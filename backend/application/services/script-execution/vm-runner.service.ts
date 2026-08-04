import { Service } from 'fastify-decorators';
import vm from 'node:vm';

import type {
  ExecutionError,
  ExecutionResult,
  SandboxGlobals,
} from './script-execution.types';
import { VmRunnerContractService } from './vm-runner-contract.service';

const DEFAULT_TIMEOUT = 5000;

/**
 * Parses error information from a VM error to extract line/column numbers
 */
function parseErrorInfo(error: Error): Partial<ExecutionError> {
  const result: Partial<ExecutionError> = {
    message: error.message,
  };

  // Try to extract line/column from the stack trace
  const stackMatch = error.stack?.match(/<anonymous>:(\d+):(\d+)/);
  if (stackMatch) {
    result.line = parseInt(stackMatch[1], 10);
    result.column = parseInt(stackMatch[2], 10);
  }

  return result;
}

/**
 * Determines the error type from an error object
 */
const RUNTIME_ERROR_NAMES = new Set([
  'TypeError',
  'ReferenceError',
  'RangeError',
]);

function getErrorType(error: Error): ExecutionError['type'] {
  const message = error.message.toLowerCase();

  if (message.includes('script execution timed out')) {
    return 'timeout';
  }

  // O erro nasce no realm da VM, entao `instanceof` visto do host e sempre
  // falso — a classificacao vai pelo `name`.
  if (
    error.name === 'SyntaxError' ||
    message.includes('unexpected token') ||
    message.includes('unexpected identifier') ||
    message.includes('invalid or unexpected token')
  ) {
    return 'syntax';
  }

  if (RUNTIME_ERROR_NAMES.has(error.name)) return 'runtime';

  return 'unknown';
}

/**
 * Normaliza o que a VM lancou num Error do host. `instanceof Error` nao cruza
 * o limite do realm, entao o objeto e reconhecido pelo formato — sem isso o
 * erro original era descartado e a classificacao caia sempre em `unknown`.
 */
function toError(thrown: unknown): Error {
  if (thrown instanceof Error) return thrown;

  if (
    typeof thrown === 'object' &&
    thrown !== null &&
    'message' in thrown &&
    'name' in thrown
  ) {
    const error = new Error(String(thrown.message));
    error.name = String(thrown.name);
    if ('stack' in thrown) error.stack = String(thrown.stack);
    return error;
  }

  return new Error(String(thrown));
}

/** Thenable de qualquer realm — `instanceof Promise` nao cruza o limite da VM. */
function isThenable(value: unknown): value is PromiseLike<unknown> {
  if (!value) return false;
  if (typeof value !== 'object' && typeof value !== 'function') return false;
  if (!('then' in value)) return false;
  return typeof value.then === 'function';
}

/**
 * Creates a timeout promise that rejects after the specified time
 */
function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Script execution timed out'));
    }, ms);
  });
}

@Service()
export default class NodeVmRunnerService implements VmRunnerContractService {
  async run(
    code: string,
    sandbox: SandboxGlobals,
    timeout: number = DEFAULT_TIMEOUT,
  ): Promise<ExecutionResult> {
    const logs: string[] = [];

    // Empty code is valid (no-op)
    if (!code || code.trim() === '') {
      return { success: true, logs };
    }

    try {
      // Code must be in IIFE format: (async () => { ... })();
      // No automatic wrapping - code executes as written by user

      // Create VM context
      const context = vm.createContext(sandbox);

      // Create script with timeout
      const script = new vm.Script(code, {
        filename: 'user-script.js',
      });

      // Run the script
      const result = script.runInContext(context, {
        timeout,
        breakOnSigint: true,
      });

      // Espera a conclusao quando o codigo devolve uma promise. Sem isso a
      // rejeicao escapa como unhandled e o script e reportado como sucesso.
      if (isThenable(result)) {
        await Promise.race([result, createTimeoutPromise(timeout)]);
      }

      // Collect logs from the sandbox's intercepted console
      if (Array.isArray(sandbox.console)) {
        logs.push(...sandbox.console);
      }

      return { success: true, logs };
    } catch (error: unknown) {
      const err = toError(error);
      const errorType = getErrorType(err);
      const errorInfo = parseErrorInfo(err);

      return {
        success: false,
        error: {
          type: errorType,
          message: errorInfo.message ?? err.message ?? 'Unknown error',
          line: errorInfo.line,
          column: errorInfo.column,
        },
        logs,
      };
    }
  }

  validateSyntax(code: string): ExecutionError | null {
    if (!code || code.trim() === '') {
      return null;
    }

    try {
      // Validate code syntax as-is (must be in IIFE format)
      new vm.Script(code);
      return null;
    } catch (error: unknown) {
      const err = toError(error);
      const errorInfo = parseErrorInfo(err);
      return {
        type: 'syntax',
        message: errorInfo.message ?? err.message ?? 'Syntax error',
        line: errorInfo.line,
        column: errorInfo.column,
      };
    }
  }
}
