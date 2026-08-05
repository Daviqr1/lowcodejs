# table-rows/bulk-delete — Exclusão Permanente de Rows em Lote

Recurso REST para excluir permanentemente rows específicos de uma tabela.

## Rota

`DELETE /tables/:slug/rows/bulk-delete`

## Arquivos

| Arquivo                      | Descrição                                                            |
| ---------------------------- | -------------------------------------------------------------------- |
| `bulk-delete.controller.ts`  | Registra a rota, aplica middleware de acesso à tabela               |
| `bulk-delete.use-case.ts`    | Lógica: hard delete dos row IDs fornecidos                           |
| `bulk-delete.validator.ts`   | Schema Zod: `{ ids: string[] }` no body                             |
| `bulk-delete.schema.ts`      | Schema OpenAPI para Swagger                                          |
| `bulk-delete.use-case.spec.ts` | Testes unitários com repositório in-memory                       |

## Comportamento

- Retorna `Either<HTTPException, { deleted: number }>`
- **Operação irreversível**: remove permanentemente do banco (não é soft delete)
- Requer permissão `REMOVE_ROW` na tabela
- Diferente de `trash` (soft delete): esta operação não pode ser revertida
- Os IDs são de rows de qualquer estado (trashed ou não)
