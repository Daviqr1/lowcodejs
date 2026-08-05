# group-rows/create/fields — Testes de Criação de Dados em Rows de Grupos

Suítes de teste unitário para validação dos valores de cada tipo de campo na
criação de rows dentro de grupos (subdocumentos de FIELD_GROUP).

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

- Testam a validação de valores de dados (row data), não de metadados de campo
- Verificam coerção de tipo, formatos (CPF, CNPJ, telefone, etc.) e required
- Usam repositórios in-memory para isolar do banco
