import { describe, expect, it } from 'vitest';

import type { SandboxGlobals } from './script-execution.types';
import NodeVmRunnerService from './vm-runner.service';

// Sandbox minimo: so o que os testes tocam.
function makeSandbox(logs: string[]): SandboxGlobals {
  const sandbox = {
    console: {
      log: (...args: unknown[]): void => {
        logs.push(args.map(String).join(' '));
      },
      warn: (): void => {},
      error: (): void => {},
    },
    doc: {},
    Promise,
    Error,
    JSON,
    Date,
    Math,
    Number,
    String,
    Object,
    Array,
  };
  // Sandbox parcial de spec: o runner so precisa do `console` e dos builtins
  // que o codigo de teste toca.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return sandbox as unknown as SandboxGlobals;
}

describe('NodeVmRunnerService', () => {
  const sut = new NodeVmRunnerService();

  describe('run', () => {
    it('trata codigo vazio como no-op bem-sucedido', async () => {
      const result = await sut.run('', makeSandbox([]));
      expect(result).toEqual({ success: true, logs: [] });
      expect(await sut.run('   ', makeSandbox([]))).toEqual({
        success: true,
        logs: [],
      });
    });

    it('roda IIFE async e coleta os logs', async () => {
      const logs: string[] = [];
      const result = await sut.run(
        "(async () => { console.log('ola'); doc.x = 1; })();",
        makeSandbox(logs),
      );
      expect(result.success).toBe(true);
      expect(logs).toEqual(['ola']);
    });

    it('classifica erro de sintaxe', async () => {
      const result = await sut.run('const = ;', makeSandbox([]));
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('syntax');
    });

    it('classifica erro de runtime lancado pelo proprio codigo', async () => {
      const result = await sut.run(
        "(async () => { throw new TypeError('x'); })();",
        makeSandbox([]),
      );
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('runtime');
    });

    it('classifica erro nascido dentro da VM pelo nome', async () => {
      // O erro vem do realm da VM, entao `instanceof` no host e sempre falso —
      // a classificacao usa `error.name`.
      const result = await sut.run('naoExiste();', makeSandbox([]));
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('runtime');
      expect(result.error?.message).toContain('naoExiste');
    });

    it('reporta falha de IIFE async que rejeita', async () => {
      const result = await sut.run(
        "(async () => { throw new Error('falhou'); })();",
        makeSandbox([]),
      );
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('falhou');
    });

    it('aguarda IIFE async que resolve antes de responder', async () => {
      const logs: string[] = [];
      const result = await sut.run(
        "(async () => { await new Promise((r) => r()); console.log('fim'); })();",
        makeSandbox(logs),
      );
      expect(result.success).toBe(true);
      expect(logs).toEqual(['fim']);
    });

    it('estoura timeout em loop sincrono infinito', async () => {
      const result = await sut.run('while (true) {}', makeSandbox([]), 50);
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('timeout');
    });

    it('nao expoe require nem process no contexto', async () => {
      // Identificador ausente lanca ReferenceError...
      for (const name of ['require', 'process', 'fetch']) {
        expect((await sut.run(`${name};`, makeSandbox([]))).success).toBe(
          false,
        );
      }
      // ...e o acesso por propriedade devolve undefined, sem vazar nada.
      const logs: string[] = [];
      const result = await sut.run(
        'console.log(String(globalThis.process));',
        makeSandbox(logs),
      );
      expect(result.success).toBe(true);
      expect(logs).toEqual(['undefined']);
    });
  });

  describe('validateSyntax', () => {
    it('aceita codigo valido e vazio', () => {
      expect(sut.validateSyntax('(async () => {})();')).toBeNull();
      expect(sut.validateSyntax('')).toBeNull();
    });

    it('reporta a sintaxe invalida sem executar', () => {
      const error = sut.validateSyntax('const = ;');
      expect(error?.type).toBe('syntax');
    });
  });
});
