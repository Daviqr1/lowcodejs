import { defineConfig } from 'vitest/config';

import { sharedPlugins, sharedTest } from './vitest.shared';

export default defineConfig({
  plugins: sharedPlugins,
  test: {
    ...sharedTest,
    setupFiles: ['./test/setup.ts'],
    include: [
      '**/*.use-case.spec.ts',
      '**/*.service.spec.ts',
      '**/*.core.spec.ts',
    ],
  },
});
