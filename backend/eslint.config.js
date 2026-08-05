import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import lowcodejs from '../eslint-local-rules/index.mjs';

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
      // A regra base `no-unused-vars` gera falso-positivo em parameter
      // properties do TS (`constructor(private readonly x)` — usado via
      // `this.x`). Desligada em favor da versao TS-aware, que entende
      // parameter properties. Params/vars/erros intencionalmente nao usados
      // usam prefixo `_`. Substitui o /* eslint-disable no-unused-vars */ de
      // topo antes espalhado nos impls.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
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
    plugins: {
      lowcodejs,
    },
    rules: {
      // regra 1: sem ternário como control-flow (?? / ?. / && seguem livres,
      // não são ternários). Cada hit legítimo inline usa disable pontual.
      'no-ternary': 'error',
      // regra 3: sem `as` (assertion). `as const` continua permitido.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'never',
        },
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
      // regra 7: async/await com try/catch, nunca cadeia .then/.catch/.finally.
      'lowcodejs/no-promise-chain': 'error',
    },
  },
  {
    // regra 4 (type não interface) não se aplica a `.d.ts` de module
    // augmentation: o TS exige `interface` p/ declaration merging (`type` não
    // funciona). Ex.: _types/fastify*.d.ts (`declare module 'fastify'`).
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  {
    // code-style: contratos abstratos declaram params nomeados nas assinaturas
    // (documentam a interface) que nao sao usados no corpo — nao ha corpo. Este
    // override desliga no-unused-vars so nesses arquivos, substituindo o
    // /* eslint-disable no-unused-vars */ de topo antes espalhado em cada um.
    files: [
      '**/*-contract.repository.ts',
      '**/*-contract.service.ts',
      '**/*.contract.ts',
    ],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    ignores: ['node_modules', 'build'],
  },
];
