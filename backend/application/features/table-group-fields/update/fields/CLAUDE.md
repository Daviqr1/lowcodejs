# group-fields/update/fields — Testes de Atualização de Campos em Grupos

Suítes de teste unitário para validação de cada tipo de campo na operação de
atualização de campos dentro de grupos de permissão.

## Arquivos

| Arquivo                          | Tipo de campo testado  |
| -------------------------------- | ---------------------- |
| `category.use-case.spec.ts`      | CATEGORY               |
| `date.use-case.spec.ts`          | DATE                   |
| `dropdown.use-case.spec.ts`      | DROPDOWN               |
| `file.use-case.spec.ts`          | FILE                   |
| `relationship.use-case.spec.ts`  | RELATIONSHIP           |
| `text-long.use-case.spec.ts`     | TEXT_LONG              |
| `text-short.use-case.spec.ts`    | TEXT_SHORT (todos os formatos) |
| `user.use-case.spec.ts`          | USER                   |

## Padrões

- Mesma estrutura dos testes de criação (`create/fields/`), adaptada para update
- Verificam que campos existentes são atualizados corretamente sem efeitos colaterais
- Validam restrições específicas do update (ex: não alterar tipo de campo após criação)
