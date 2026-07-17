# error-log — Repositório de logs de erro

Repositório da entidade **ErrorLog** (erros de aplicação capturados, listados/
resolvidos pelo recurso `resources/error-logs/`).

| Arquivo                            | Papel                                                            |
| ---------------------------------- | --------------------------------------------------------------- |
| `error-log-contract.repository.ts` | Classe abstrata `ErrorLogContractRepository` (export nomeado)   |
| `error-log.repository.ts`          | Impl Mongoose (`export default`)                                |

Segue o padrão de repositório do backend (contract + impl pareados por
convenção no `di-registry`). Ver [../CLAUDE.md](../CLAUDE.md) e
`backend/CLAUDE.md` (Repository Contract Pattern).
