/**
 * code-style regra 5: combinar tipos-objeto com `Merge<A, B>`, nao com a
 * intersecao `A & B`. `Merge` acha as chaves e mostra o tipo final flat no
 * editor; a cadeia de `&` nao.
 *
 * Reporta qualquer `TSIntersectionType`. Excecao sintatica: intersecao que
 * envolve um tipo array (`Array<T>`, `ReadonlyArray<T>`, `T[]`) — `Merge`
 * mapeia as chaves e destroi a semantica de array, entao esses seguem com `&`.
 * Uniao no operando (ex.: `MenuItem & {}` onde `MenuItem` e uniao) nao da p/
 * detectar sem type-info: nesses poucos casos use
 * `// eslint-disable-next-line lowcodejs/no-type-intersection` com uma
 * justificativa curta em PT-BR.
 */

function isArrayLike(node) {
  if (node.type === 'TSArrayType') return true;
  if (
    node.type === 'TSTypeReference' &&
    node.typeName.type === 'Identifier' &&
    (node.typeName.name === 'Array' || node.typeName.name === 'ReadonlyArray')
  ) {
    return true;
  }
  return false;
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Combinar tipos-objeto com Merge<A, B> em vez da intersecao A & B',
    },
    messages: {
      useMerge:
        'Use Merge<A, B> no lugar da intersecao "&" de tipos-objeto (code-style regra 5). Excecao com array mantem "&".',
    },
    schema: [],
  },
  create(context) {
    return {
      TSIntersectionType(node) {
        if (node.types.some(isArrayLike)) return;
        context.report({ node, messageId: 'useMerge' });
      },
    };
  },
};
