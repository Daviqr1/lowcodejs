# table-rows/update/fields — Testes de Atualização de Dados de Rows

Suítes de teste unitário para validação dos valores de cada tipo de campo na
atualização de rows em tabelas dinâmicas.

## Arquivos

| Arquivo                          | Tipo de campo testado         |
| -------------------------------- | ----------------------------- |
| `category.use-case.spec.ts`      | CATEGORY                      |
| `date.use-case.spec.ts`          | DATE                          |
| `dropdown.use-case.spec.ts`      | DROPDOWN                      |
| `evaluation.use-case.spec.ts`    | EVALUATION                    |
| `field-group.use-case.spec.ts`   | FIELD_GROUP                   |
| `file.use-case.spec.ts`          | FILE                          |
| `reaction.use-case.spec.ts`      | REACTION                      |
| `relationship.use-case.spec.ts`  | RELATIONSHIP                  |
| `text-long.use-case.spec.ts`     | TEXT_LONG                     |
| `text-short.use-case.spec.ts`    | TEXT_SHORT                    |
| `user.use-case.spec.ts`          | USER                          |

## Padrões

- Mesma estrutura dos testes de `create/fields/`, adaptada para update
- Verificam atualização parcial (campos não enviados mantêm valor anterior)
- Testam que campos imutáveis (ex: tipo, criação) não são sobrescritos no update
