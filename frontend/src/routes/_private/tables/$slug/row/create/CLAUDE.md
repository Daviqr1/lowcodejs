# tables/$slug/row/create — Criar registro

Formulário de criação de um registro na tabela `$slug`. Aceita o search param
`category` (pré-preenche o campo CATEGORY quando criado a partir da
visualização documento).

| Arquivo            | Papel                                                                  |
| ------------------ | ---------------------------------------------------------------------- |
| `-create-form.tsx` | Componente privado (prefixo `-`): monta o form dinâmico via TanStack Form a partir de `IField[]`, valida e chama `useTableRowCreate` |

Reusa os field components de `@/integrations/tanstack-form` e utilitários de
`@/lib/table`.
