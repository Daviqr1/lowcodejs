import { tanstackConfig } from '@tanstack/eslint-config';
import prettier from 'eslint-plugin-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

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
    // code-style: 3 regras aplicadas a TODO .ts/.tsx (src + extensions) — nada
    // escapa. Exceções: routeTree.gen.ts (gerado) e components/ui (shadcn).
    // `as const` continua permitido; casts de fronteira runtime/lib-forced usam
    // eslint-disable pontual justificado.
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/routeTree.gen.ts', 'src/components/ui/**'],
    rules: {
      'no-ternary': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]);
