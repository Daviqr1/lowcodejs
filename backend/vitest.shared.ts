import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { UserConfig } from 'vitest/config';

/**
 * Base compartilhada das duas suites. Antes `vitest.config.ts` e
 * `vitest.e2e.config.ts` eram byte-identicos nas 22 primeiras linhas e nos
 * blocos de coverage/exclude — so 5 chaves de fato divergem.
 */
export const sharedPlugins: UserConfig['plugins'] = [
  tsconfigPaths(),
  swc.vite({
    jsc: {
      parser: {
        syntax: 'typescript',
        decorators: true,
        dynamicImport: true,
      },
      transform: {
        legacyDecorator: true,
        decoratorMetadata: true,
      },
      target: 'es2024',
    },
  }),
];

const IGNORED = ['node_modules/', 'build/', '**/*.config.*', '**/coverage/**'];

export const sharedTest = {
  root: './',
  globals: true,
  environment: 'node' as const,
  coverage: {
    provider: 'v8' as const,
    reporter: ['text', 'json', 'html'],
    exclude: IGNORED,
  },
  exclude: IGNORED,
};
