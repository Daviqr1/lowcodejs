# group-rows/update/fields — Testes de Atualização de Dados em Rows de Grupos

Suítes de teste unitário para validação dos valores de cada tipo de campo na
atualização de rows dentro de grupos (subdocumentos de FIELD_GROUP).

## Arquivos

| Arquivo                          | Tipo de campo testado  |
| -------------------------------- | ---------------------- |
| `category.use-case.spec.ts`      | CATEGORY               |
| `date.use-case.spec.ts`          | DATE                   |
| `dropdown.use-case.spec.ts`      | DROPDOWN               |
| `file.use-case.spec.ts`          | FILE                   |
| `relationship.use-case.spec.ts`  | RELATIONSHIP           |
| `text-long.use-case.spec.ts`     | TEXT_LONG              |
| `text-short.use-case.spec.ts`    | TEXT_SHORT             |
| `user.use-case.spec.ts`          | USER                   |

## Padrões

- Mesma estrutura dos testes de `create/fields/`, adaptada para update de dados
- Verificam que atualização parcial de campos funciona corretamente
- Validam que campos não enviados no payload não são sobrescritos
