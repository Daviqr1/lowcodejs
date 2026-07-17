# Email Service

Servico de envio de email via SMTP. Credenciais lidas dinamicamente do
documento `Setting` no MongoDB (configuradas via UI `/settings`).

**Importante:** Use-cases NAO devem injetar `EmailContractService` diretamente. O envio agora passa por uma fila BullMQ (`services/email-queue/`). Use-cases chamam `await emailQueue.enqueue(...)`; o `EmailWorker` consome a fila e chama `EmailContractService.buildTemplate + sendEmail`.

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `email-contract.service.ts` | Classe abstrata com interface EmailOptions e EmailResult |
| `email.service.ts` | Implementacao com Nodemailer. A cada `sendEmail()` le o Setting, monta o transporter via `buildNodemailerConfig(setting)` e envia. Retorna `{ success: false, message: 'SMTP nao configurado' }` com warn se HOST/PORT/USER/PASSWORD ausentes |
| `in-memory-email.service.ts` | Mock para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `sendEmail(options)` | `EmailResult` | Envia email com to[], subject, body, from opcional |
| `buildTemplate(payload)` | `string` | Renderiza template EJS com dados dinamicos |

## Tipos

- `EmailOptions` - to (string[]), subject, body, from opcional
- `EmailResult` - success (boolean), message, testUrl opcional (Ethereal em dev)

## Registro DI

`injectablesHolder.injectService(EmailContractService, NodemailerEmailService)`
