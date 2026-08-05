# table-rows/empty-trash — Esvaziar Lixeira de Rows

Recurso REST para excluir permanentemente todos os rows no lixeiro de uma tabela.

## Rota

`DELETE /tables/:slug/rows/empty-trash`

## Arquivos

| Arquivo                      | Descrição                                                              |
| ---------------------------- | ---------------------------------------------------------------------- |
| `empty-trash.controller.ts`  | Registra a rota, aplica middleware de acesso à tabela                 |
| `empty-trash.use-case.ts`    | Lógica: hard delete de todos os rows com `trashed=true` da tabela     |
| `empty-trash.validator.ts`   | Sem body (operação sem payload)                                        |
| `empty-trash.schema.ts`      | Schema OpenAPI para Swagger                                            |
| `empty-trash.use-case.spec.ts` | Testes unitários com repositório in-memory                         |

## Comportamento

- Retorna `Either<HTTPException, { deleted: number }>`
- **Operação irreversível**: remove permanentemente do banco
- Afeta apenas rows com `trashed=true` da tabela identificada pelo `:slug`
- Requer permissão `REMOVE_ROW` na tabela
