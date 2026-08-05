# database/shared — Utilitários de Migrations/Seeders

Helpers compartilhados pelos scripts de `migrations/` e `seeders/`.

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `task-logger.ts` | `TaskLogger` — logger padronizado de status para migrations/seeders |
| `migration-runner.ts` | `runMigration` — esqueleto comum das migrations (conexões, marker, `--force`, `finally`) |

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

## `runMigration`

Esqueleto dos oito passos que toda migration de boot repetia: `.env`, checagem
de `DATABASE_URL`, conexão do sistema (e a de dados quando
`withDataConnection: true`), leitura do marker no Setting singleton, skip
idempotente, execução, gravação do marker e `close()` no `finally`.

```ts
runMigration({
  title: TITLE,
  marker: 'MIGRATION_MENU_VISIBILITY_AT',
  async run({ db, logger }): Promise<string> {
    const result = await backfill(db);
    return `${result.updated} de ${result.total} menus atualizados`;
  },
}).catch((error: unknown): never => reportMigrationFailure(TITLE, error));
```

O `run` devolve o resumo do `logger.done()`. Para reter o marker e reprocessar
no próximo boot, devolva `{ summary, keepPending: true }`.

As migrations que não usam o runner têm esqueleto próprio (retenção de marker
por pendência, `--drop-source`, `--dry-run`).
