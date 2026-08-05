# table-base/empty-trash — Esvaziar Lixeira de Tabelas

Recurso REST para excluir permanentemente todas as tabelas no lixeiro.

## Rota

`DELETE /tables/empty-trash`

## Arquivos

| Arquivo                      | Descrição                                                     |
| ---------------------------- | ------------------------------------------------------------- |
| `empty-trash.controller.ts`  | Registra a rota, aplica middlewares de auth                   |
| `empty-trash.use-case.ts`    | Lógica: hard delete de todas as tabelas com `trashed=true`   |
| `empty-trash.validator.ts`   | Sem body (operação sem payload)                               |
| `empty-trash.schema.ts`      | Schema OpenAPI para Swagger                                   |
| `empty-trash.use-case.spec.ts` | Testes unitários com repositório in-memory               |

## Comportamento

- Retorna `Either<HTTPException, { deleted: number }>`
- **Operação irreversível**: remove permanentemente do banco
- Afeta apenas tabelas com `trashed=true`
- Cascata: deve remover também os campos e rows associados à tabela
