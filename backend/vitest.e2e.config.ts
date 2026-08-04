import { defineConfig } from 'vitest/config';

import { sharedPlugins, sharedTest } from './vitest.shared';

export default defineConfig({
  plugins: sharedPlugins,
  test: {
    ...sharedTest,
    // Suite e2e usa MongoDB real: um worker por vez, timeout largo.
    pool: 'forks',
    maxWorkers: 1,
    setupFiles: ['./test/setup.e2e.ts'],
    include: ['**/*.controller.spec.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
