# database/shared — Utilitários de Migrations/Seeders

Helpers compartilhados pelos scripts de `migrations/` e `seeders/`.

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `task-logger.ts` | `TaskLogger` — logger padronizado de status para migrations/seeders |

## `TaskLogger`

Instanciado com um título (`new TaskLogger(TITLE)`); imprime status uniformes no
console durante a execução de uma migration/seed:

| Método | Uso |
|--------|-----|
| `running()` | Início do processamento |
| `skipped(at?)` | No-op: marker já setado (data opcional) |
| `item(line)` | Progresso item-a-item |
| `done(summary?)` | Conclusão com resumo |
| `ok(detail?)` | Sucesso simples |
| `noop(reason)` | Migration marcadora (nada a fazer) |
| `failed(error)` | Falha — usado no `.catch()` de topo antes do `process.exit(1)` |

Ver o "Pattern de Migration" em `database/migrations/CLAUDE.md` (passo 5/8).
