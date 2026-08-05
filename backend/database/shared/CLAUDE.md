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
idempotente, execução, gravação do marker, `close()` no `finally` e o report da
falha.

```ts
await runMigration({
  title: TITLE,
  marker: 'MIGRATION_MENU_VISIBILITY_AT',
  async run({ db, logger }): Promise<string> {
    const result = await backfill(db);
    return `${result.updated} de ${result.total} menus atualizados`;
  },
});
```

O `run` devolve o resumo do `logger.done()`. Para reter o marker e reprocessar
no próximo boot, devolva `{ summary, keepPending: true }`.

O tratamento de erro é **do runner**: ele captura, fecha as conexões no
`finally` e só então chama `reportMigrationFailure(title, error)`
(`TaskLogger.failed` + `process.exit(1)`). A migration usa top-level `await` e
não escreve `try/catch` nem `.catch()` — code-pattern regra 7.

As migrations que não usam o runner têm esqueleto próprio (retenção de marker
por pendência, `--drop-source`, `--dry-run`) e chamam `reportMigrationFailure`
no `catch` do seu próprio top-level `await`.
