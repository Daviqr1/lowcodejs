# table-fields/update/fields — Testes de Atualização de Campos de Tabela

Suítes de teste unitário para validação de cada tipo de campo na atualização de
campos de tabelas dinâmicas.

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
- Verificam imutabilidade do tipo de campo após criação
- Validam que opções (dropdown, category) podem ser adicionadas/removidas
