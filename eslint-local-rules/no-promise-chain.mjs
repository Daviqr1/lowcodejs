/**
 * code-style regra 7: `async/await` com `try/catch`, nunca a cadeia
 * `.then()` / `.catch()` / `.finally()` numa promise. A cadeia esconde o fluxo
 * em callback e perde o contexto do erro; o `await` le de cima pra baixo.
 *
 * Heuristica sintatica: reporta qualquer chamada de metodo `.then`, `.catch` ou
 * `.finally`. Nao ha type-info aqui, entao um metodo proprio homonimo tambem
 * dispara — na pratica esses nomes so existem em promise. Combinadores seguem
 * validos desde que voce faca `await` do resultado (`await Promise.all([...])`)
 * em vez de encadear.
 *
 * Fronteira genuina que nao da para converter resolve com
 * `// eslint-disable-next-line lowcodejs/no-promise-chain` mais uma
 * justificativa curta em PT-BR.
 */

const CHAIN_METHODS = new Set(['then', 'catch', 'finally']);

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Usar async/await com try/catch em vez da cadeia .then/.catch/.finally',
    },
    messages: {
      useAwait:
        'Cadeia ".{{method}}()" numa promise — use `await` dentro de uma funcao `async` e trate o erro com `try/catch` (code-style regra 7).',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression') return;
        if (callee.computed) return;
        if (callee.property.type !== 'Identifier') return;
        if (!CHAIN_METHODS.has(callee.property.name)) return;

        context.report({
          node: callee.property,
          messageId: 'useAwait',
          data: { method: callee.property.name },
        });
      },
    };
  },
};
