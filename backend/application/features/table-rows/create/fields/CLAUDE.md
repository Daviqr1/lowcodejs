# table-rows/create/fields — Testes de Criação de Dados de Rows

Suítes de teste unitário para validação dos valores de cada tipo de campo na
criação de rows em tabelas dinâmicas.

## Arquivos

| Arquivo                          | Tipo de campo testado         |
| -------------------------------- | ----------------------------- |
| `category.use-case.spec.ts`      | CATEGORY                      |
| `date.use-case.spec.ts`          | DATE                          |
| `dropdown.use-case.spec.ts`      | DROPDOWN                      |
| `evaluation.use-case.spec.ts`    | EVALUATION                    |
| `field-group.use-case.spec.ts`   | FIELD_GROUP (subdocumentos)   |
| `file.use-case.spec.ts`          | FILE                          |
| `reaction.use-case.spec.ts`      | REACTION                      |
| `relationship.use-case.spec.ts`  | RELATIONSHIP                  |
| `text-long.use-case.spec.ts`     | TEXT_LONG                     |
| `text-short.use-case.spec.ts`    | TEXT_SHORT                    |
| `user.use-case.spec.ts`          | USER                          |

## Padrões

- Testam validação de valores de dados (`RowData`), não metadados de campo
- `field-group` testa criação de subdocumentos aninhados
- `evaluation` e `reaction` testam campos calculados/agregados
- Verificam `required`, formatos, coerção de tipo e limites de tamanho
