# group-fields/create/fields — Testes de Criação de Campos em Grupos

Suítes de teste unitário para validação de cada tipo de campo na operação de
criação de campos dentro de grupos de permissão.

## Arquivos

Cada arquivo testa o comportamento de criação para um tipo de campo específico:

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

- Usam repositório in-memory (`GroupFieldInMemoryRepository`)
- Testam happy path (criação válida) e error cases (payload inválido)
- `text-short` cobre múltiplos formatos: ALPHA_NUMERIC, EMAIL, URL, PHONE, CPF, CNPJ, etc.
- Os testes validam que o use-case de criação aplica corretamente as regras de
  cada tipo antes de persistir
