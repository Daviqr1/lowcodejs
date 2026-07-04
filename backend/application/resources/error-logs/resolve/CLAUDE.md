# error-logs/resolve — Resolver log de erro

Marca um ErrorLog como resolvido. Padrão controller → validator (Zod) →
use-case (`Either<HTTPException, ...>`) → `ErrorLogContractRepository`.

| Arquivo                | Papel                                             |
| ---------------------- | ------------------------------------------------- |
| `resolve.controller.ts` | HTTP: parse params, delega, formata resposta     |
| `resolve.use-case.ts`   | Atualiza o log para resolvido (NOT_FOUND se falta) |
| `resolve.validator.ts`  | Schema Zod (id do log)                            |

Ver `backend/CLAUDE.md` (Responsabilidades por Camada) e o repo em
`repositories/error-log/`.
