# error-logs/paginated — Listar logs de erro (paginado)

`GET` paginado de ErrorLog. Padrão controller → validator (Zod) → use-case
(`Either<HTTPException, Paginated<ErrorLog>>`) → `ErrorLogContractRepository`.

| Arquivo                 | Papel                                            |
| ----------------------- | ------------------------------------------------ |
| `paginated.controller.ts` | HTTP: parse, valida, delega, formata resposta  |
| `paginated.use-case.ts`   | Busca paginada + filtros                        |
| `paginated.validator.ts`  | Schema Zod de query (page/perPage/filtros)      |

Ver `backend/CLAUDE.md` (Responsabilidades por Camada) e o repo em
`repositories/error-log/`.
