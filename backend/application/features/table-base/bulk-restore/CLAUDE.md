# table-base/bulk-restore — Restauração em Lote de Tabelas

Recurso REST para restaurar múltiplas tabelas do lixeiro de volta ao estado ativo.

## Rota

`PATCH /tables/bulk-restore`

## Arquivos

| Arquivo                       | Descrição                                                  |
| ----------------------------- | ---------------------------------------------------------- |
| `bulk-restore.controller.ts`  | Registra a rota, aplica middlewares de auth                |
| `bulk-restore.use-case.ts`    | Lógica: filtra tabelas com `trashed=true` e restaura      |
| `bulk-restore.validator.ts`   | Schema Zod: `{ slugs: string[] }` no body                 |
| `bulk-restore.schema.ts`      | Schema OpenAPI para Swagger                                |
| `bulk-restore.use-case.spec.ts` | Testes unitários com repositório in-memory              |

## Comportamento

- Retorna `Either<HTTPException, { modified: number; skipped?: string[] }>`
- Apenas tabelas com `trashed=true` são afetadas
- **Pula** tabelas cujo slug já está em uso por uma tabela ativa — slug é a
  chave da coleção dinâmica, então restaurar duplicaria registros e deixaria
  duas tabelas iguais na lista. Os slugs pulados voltam em `skipped` (ausente
  quando nada é pulado)
- `modified` indica quantas tabelas foram efetivamente restauradas
- Requer autenticação JWT; permissão verificada no middleware de auth
