# Services

Toda logica de comportamento do backend. Mesmo pattern Contract + Implementation
dos repositories, registrado automaticamente pelo scanner do `di-registry.ts`.

**Regra de agrupamento: um service por contexto, nao um por arquivo de origem.**
Funcoes duplicadas ou do mesmo assunto colapsam num service so — foi assim que
as 4 implementacoes de coercao de valor viraram `FieldValueContractService` e as
3 de normalizacao de busca viraram `SearchContractService`.

## Services de base (sem dependencias, usados por quase todo o resto)

| Dir | Contexto |
| --- | --- |
| `slug/` | gerar e validar slug; fonte unica de `slugify()` |
| `identifier/` | validar id de documento e gerar UUID |
| `date/` | data e hora (ISO, recorte de dia UTC, pt-BR, buckets mensais) |
| `search/` | normalizar e **escapar** texto para `$regex` |
| `field-value/` | converter, coagir e formatar valor de campo dinamico |
| `type-guard/` | `isRecord` (array passa) e `isPlainObject` (array nao passa) |
| `http-response/` | envelope unico de erro dos controllers (`sendError`) |

> `search.escape()` e obrigatorio em qualquer `$regex` montado a partir de
> entrada do usuario — sem ele o termo e interpretado como padrao.

## Escapes documentados de `new` em vez de injecao

Ha tres lugares onde instanciar a mao e correto, todos comentados no codigo:

- **schemas Zod de escopo de modulo** (validators) — avaliados no import, antes
  de o container existir
- **migrations e seeders** — rodam como script standalone, fora do kernel
- **doubles in-memory** — o scanner do DI ignora `*-in-memory.*` por convencao

Por isso todo service puro tem **constructor sem argumentos**.

## Verificacao

`npm run di:check` e `npm run boot:check` — ver `application/core/CLAUDE.md`.

## Email Service (`email/`)

| Arquivo | Descricao |
|---------|-----------|
| `email-contract.service.ts` | Abstract class: `sendEmail(options)`, `buildTemplate(payload)` |
| `email.service.ts` | Implementacao SMTP via Nodemailer (`NodemailerEmailService`, `export default`). Filtra emails validos, gera versao texto. Em dev retorna testUrl (Ethereal) |
| `in-memory-email.service.ts` | Mock para testes (uso direto raro — preferir `InMemoryEmailQueueService`) |

Registrado no DI **automaticamente** pelo scanner (`email-contract.service.ts` ↔ `email.service.ts`).

**Importante:** Use-cases nao chamam `EmailContractService` diretamente. Eles enfileiram jobs em `EmailQueueContractService` (`email-queue/`). O `EmailWorker` e o unico consumidor de `EmailContractService`.

## Email Queue (`email-queue/`)

Fila BullMQ que desacopla envio de email do fluxo da request. Replica o padrao
de `services/storage-migration/`. Detalhes em `email-queue/CLAUDE.md`.

Impl: `email-queue.service.ts` (`BullMQEmailQueueService`, `export default`).
Registrado no DI automaticamente pelo scanner.

## Storage Service (`storage.service.ts`)

| Metodo | Descricao |
|--------|-----------|
| `upload(part, staticName?)` | Upload de arquivo. Imagens convertidas para WebP 1200x1200. |
| `delete(filename)` | Remove arquivo |
| `exists(filename)` | Verifica existencia |

**Nota:** Ainda nao segue o pattern contract. Candidato a formalizacao futura.

## Field Validation Service (`field-validation/`)

Executa as regras de `field.validations[]` (camada única — `core/validations/`)
no create/update/bulk-update de row, após o `RowPayloadValidator` estrutural.
Async (regras como is-unique consultam o banco). Injeta `RowContractRepository` +
`UserContractRepository`. Detalhes em `field-validation/CLAUDE.md`.

## Scheduler (`scheduler/`)

Engine de agendamentos **in-process** (port 1:1 do `@nestjs/schedule`). Decorators
`@Cron`/`@Interval`/`@Timeout` em métodos de qualquer classe DI-gerenciada,
descobertos no boot. Expõe `SchedulerRegistryContractService` (injetável) para
controle em runtime. Ligado em `bin/server.ts` após `kernel.ready()` (env
`SCHEDULER_ENABLED`). Detalhes e uso em `scheduler/CLAUDE.md`.

## Para Criar Novo Service

1. Crie diretorio `services/{nome}/`
2. Crie `{nome}-contract.service.ts` com abstract class `{Nome}ContractService`
   (export nomeado)
3. Crie `{nome}.service.ts` com `@Service() export default class` da impl
4. Crie `in-memory-{nome}.service.ts` para testes (ignorado pelo scanner)

O `di-registry.ts` registra o par automaticamente pela convencao
`{nome}-contract.service.ts` ↔ `{nome}.service.ts` — **nao precisa editar nada**.
