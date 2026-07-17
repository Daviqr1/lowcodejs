import { tanstackConfig } from '@tanstack/eslint-config';
import prettier from 'eslint-plugin-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

import lowcodejs from '../eslint-local-rules/index.mjs';

export default defineConfig([
  ...tanstackConfig,
  globalIgnores(['dist', 'node_modules', 'src/components/ui']),
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowTypedFunctionExpressions: true,
        },
      ],
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'import/order': [
        'error',
        {
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          groups: [['builtin', 'external'], 'internal', 'parent', 'sibling'],
          'newlines-between': 'always',
        },
      ],
    },
  },
  {
    // code-style: as 6 regras aplicadas a TODO .ts/.tsx (src + extensions) —
    // nada escapa. Exceções: routeTree.gen.ts (gerado) e components/ui (shadcn).
    // `as const` continua permitido; casts de fronteira runtime/lib-forced usam
    // eslint-disable pontual justificado.
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/routeTree.gen.ts', 'src/components/ui/**'],
    plugins: {
      lowcodejs,
    },
    rules: {
      // regra 1: sem ternário como control-flow (?? / ?. / && seguem livres).
      'no-ternary': 'error',
      // regra 3: sem `as` (assertion). `as const` continua permitido.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      // regra 2: sem `any` desnecessário.
      '@typescript-eslint/no-explicit-any': 'error',
      // regra 4: sempre `type`, nunca `interface` (augmentation em .d.ts /
      // `declare module` não dispara — é limite da linguagem, não estilo).
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // regra 5: combinar tipos-objeto com Merge<A, B>, não `A & B`.
      'lowcodejs/no-type-intersection': 'error',
      // regra 6: lookup object no lugar de cadeia if/else-if 3+.
      'lowcodejs/prefer-lookup-object': 'error',
    },
  },
  {
    // regra 4 (type não interface) não se aplica a `.d.ts` de module
    // augmentation: o TS exige `interface` p/ declaration merging (`type` não
    // funciona). Ex.: lib/tanstack-table.d.ts.
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
]);
