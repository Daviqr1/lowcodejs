/**
 * Plugin ESLint local do LowCodeJS. Regras sintaticas (sem type-info) que
 * fecham as regras 5, 6 e 7 do code-style que nao tem equivalente nativo.
 * Importado pelos dois configs (`backend/eslint.config.js`,
 * `frontend/eslint.config.js`) sob o namespace `lowcodejs/*`. Cada config
 * escolhe quais regras liga — estar aqui nao liga em lugar nenhum.
 */

import noPromiseChain from './no-promise-chain.mjs';
import noTypeIntersection from './no-type-intersection.mjs';
import preferLookupObject from './prefer-lookup-object.mjs';

export default {
  meta: {
    name: 'eslint-plugin-lowcodejs',
    version: '1.0.0',
  },
  rules: {
    'no-promise-chain': noPromiseChain,
    'no-type-intersection': noTypeIntersection,
    'prefer-lookup-object': preferLookupObject,
  },
};
