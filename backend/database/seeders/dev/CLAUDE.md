# seeders/dev — Seeds de Desenvolvimento

Seeds **apenas para dev/teste local**. **Não** são descobertos pelo `main.ts`
(nome não termina em `.seed.ts`) e **não** rodam no boot Docker.

## Arquivos

| Arquivo | Comando | Descrição |
|---------|---------|-----------|
| `seed-test-users.ts` | `npm run seed:test-users` | Cria N usuários `*@demo.com` (default 25; `-- --count=N`) com grupos variados (peso maior em REGISTERED), ~1/3 inativos, senha `Teste@123` |

## Comportamento

- **Idempotente**: apaga os `*@demo.com` anteriores (`deleteMany` por regex de
  e-mail) antes de recriar.
- Distribui os grupos a partir dos que existem no banco (`REGISTERED`/`MANAGER`/
  `ADMINISTRATOR`) — exige `npm run seed` antes (para os grupos existirem), senão
  aborta.
- Conecta direto via `mongoose.connect(DATABASE_URL, { dbName: DB_DATABASE })` e
  insere no driver nativo (docs crus).

> Pré-requisito: rode `npm run seed` primeiro (cria permissões + grupos). Ver
> `../CLAUDE.md`.
