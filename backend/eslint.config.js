import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      globals: globals.node,
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      prettier,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowTypedFunctionExpressions: true,
        },
      ],
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
      // Desabilitado porque quebra DI com fastify-decorators
      // A regra converte imports de classes para 'import type', removendo
      // a referência no runtime e quebrando o reflect-metadata
      '@typescript-eslint/consistent-type-imports': 'off',
      // Permite uso de ?. e ?? mesmo quando TypeScript acha desnecessário
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
  },
  {
    // code-style aplicado a TODO o backend (application, extensions, database,
    // hooks, config, test, bin, start...) — nada escapa. `as const` segue
    // permitido; casts de fronteira de runtime usam disable pontual justificado.
    files: ['**/*.ts'],
    rules: {
      // code-style: sem ternário como control-flow (?? / ?. / && seguem livres,
      // não são ternários). Cada hit legítimo inline usa disable pontual.
      'no-ternary': 'error',
      // code-style: sem `as` (assertion). `as const` continua permitido.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'never',
        },
      ],
      // code-style: sem `any` desnecessário.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    ignores: ['node_modules', 'build'],
  },
];
