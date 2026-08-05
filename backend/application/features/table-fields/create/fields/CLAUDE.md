# table-fields/create/fields — Testes de Criação de Campos de Tabela

Suítes de teste unitário para validação de cada tipo de campo na criação de
campos de tabelas dinâmicas.

## Arquivos

| Arquivo                          | Tipo de campo testado                          |
| -------------------------------- | ---------------------------------------------- |
| `category.use-case.spec.ts`      | CATEGORY (opções de categoria)                 |
| `date.use-case.spec.ts`          | DATE (formatos de data/hora)                   |
| `dropdown.use-case.spec.ts`      | DROPDOWN (opções dropdown)                     |
| `evaluation.use-case.spec.ts`    | EVALUATION (avaliação/rating)                  |
| `field-group.use-case.spec.ts`   | FIELD_GROUP (campos aninhados)                 |
| `file.use-case.spec.ts`          | FILE (upload de arquivos)                      |
| `reaction.use-case.spec.ts`      | REACTION (emojis/reações)                      |
| `relationship.use-case.spec.ts`  | RELATIONSHIP (relação entre tabelas)           |
| `text-long.use-case.spec.ts`     | TEXT_LONG (texto longo / rich text)            |
| `text-short.use-case.spec.ts`    | TEXT_SHORT (múltiplos formatos)                |
| `user.use-case.spec.ts`          | USER (campo de usuário)                        |

## Padrões

- Testam criação de metadados de campo (`IField`), não de dados de rows
- `field-group`, `evaluation` e `reaction` são específicos de tabelas (não
  existem em group-fields)
- `text-short` cobre todos os formatos: ALPHA_NUMERIC, EMAIL, URL, PHONE, CPF,
  CNPJ, DATE, TIME, NUMBER, CURRENCY, etc.
