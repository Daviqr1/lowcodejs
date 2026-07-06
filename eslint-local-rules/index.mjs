/**
 * Plugin ESLint local do LowCodeJS. Regras sintaticas (sem type-info) que
 * fecham as regras 5 e 6 do code-style que nao tem equivalente nativo.
 * Importado pelos dois configs (`backend/eslint.config.js`,
 * `frontend/eslint.config.js`) sob o namespace `lowcodejs/*`.
 */

import noTypeIntersection from './no-type-intersection.mjs';
import preferLookupObject from './prefer-lookup-object.mjs';

export default {
  meta: {
    name: 'eslint-plugin-lowcodejs',
    version: '1.0.0',
  },
  rules: {
    'no-type-intersection': noTypeIntersection,
    'prefer-lookup-object': preferLookupObject,
  },
};
