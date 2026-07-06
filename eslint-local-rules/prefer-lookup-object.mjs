/**
 * code-style regra 6: quando mapeia um discriminante (chave/`type`/enum) para
 * um valor ou handler em 3+ casos, usar um lookup object (mapa de despacho) no
 * lugar da cadeia de `if`/`else if`.
 *
 * Heuristica sintatica: reporta o topo de uma cadeia `if / else if` de 3+
 * niveis onde CADA teste e uma comparacao `===`/`!==` e um mesmo operando
 * (discriminante) se repete em todos os testes. Nao dispara em condicoes
 * combinadas (`&&`/`||` viram LogicalExpression) nem em ranges (`<`/`>`) —
 * essas seguem `if`. Imperfeita por design: falso-negativo e aceitavel;
 * falso-positivo raro resolve com disable pontual justificado.
 */

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Usar lookup object no lugar de cadeia if/else-if 3+ sobre o mesmo discriminante',
    },
    messages: {
      useLookup:
        'Cadeia if/else-if de {{count}} casos sobre o mesmo discriminante — use um lookup object (code-style regra 6).',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    function operands(test) {
      if (!test || test.type !== 'BinaryExpression') return null;
      if (test.operator !== '===' && test.operator !== '!==') return null;
      return [sourceCode.getText(test.left), sourceCode.getText(test.right)];
    }

    return {
      IfStatement(node) {
        // so avalia a partir do topo da cadeia (nao de cada else-if aninhado)
        if (node.parent?.type === 'IfStatement' && node.parent.alternate === node) {
          return;
        }

        const tests = [];
        let current = node;
        while (current?.type === 'IfStatement') {
          const pair = operands(current.test);
          if (!pair) break;
          tests.push(pair);
          current = current.alternate;
        }

        if (tests.length < 3) return;

        // discriminante = operando comum a TODOS os testes
        let common = new Set(tests[0]);
        for (let index = 1; index < tests.length; index++) {
          const next = new Set(tests[index]);
          common = new Set([...common].filter((text) => next.has(text)));
        }

        if (common.size >= 1) {
          context.report({
            node,
            messageId: 'useLookup',
            data: { count: tests.length },
          });
        }
      },
    };
  },
};
