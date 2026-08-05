# table-base/bulk-trash — Soft Delete em Lote de Tabelas

Recurso REST para mover múltiplas tabelas para o lixeiro (soft delete).

## Rota

`PATCH /tables/bulk-trash`

## Arquivos

| Arquivo                     | Descrição                                                     |
| --------------------------- | ------------------------------------------------------------- |
| `bulk-trash.controller.ts`  | Registra a rota, aplica middlewares de auth                   |
| `bulk-trash.use-case.ts`    | Lógica: marca tabelas com `trashed=true`                     |
| `bulk-trash.validator.ts`   | Schema Zod: `{ slugs: string[] }` no body                    |
| `bulk-trash.schema.ts`      | Schema OpenAPI para Swagger                                   |
| `bulk-trash.use-case.spec.ts` | Testes unitários com repositório in-memory                |

## Comportamento

- Retorna `Either<HTTPException, { modified: number }>`
- Apenas tabelas com `trashed=false` são afetadas (não repete operação)
- Soft delete: dados preservados, tabela oculta da listagem principal
- Hard delete só ocorre via `empty-trash`
