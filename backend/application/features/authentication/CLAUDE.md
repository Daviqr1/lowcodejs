# Authentication Resource

Recurso de autenticacao do sistema. Gerencia login, registro, logout, magic links, refresh de tokens e recuperacao de senha.

## Base Route

`/authentication`

## Entidades

- `IUser` (User) - usuario principal
- `IValidationToken` (ValidationToken) - tokens de validacao para magic link e recuperacao de senha

## Repositorios

- `UserContractRepository` - busca, criacao e atualizacao de usuarios
- `UserGroupContractRepository` - busca de grupos de usuario (sign-up)
- `ValidationTokenContractRepository` - criacao, busca e atualizacao de tokens de validacao

## Servicos

- `EmailQueueContractService` - enfileira email para sign-up (welcome), request-code (codigo recuperacao), reset-password (confirmacao). Worker BullMQ processa async com retry

## Endpoints

| Operacao | Metodo | Rota | Auth | Descricao |
|----------|--------|------|------|-----------|
| sign-in | POST | `/authentication/sign-in` | Nao | Login com email/senha |
| sign-up | POST | `/authentication/sign-up` | Nao | Registro de novo usuario |
| sign-out | POST | `/authentication/sign-out` | Sim | Logout (limpa cookies) |
| magic-link | GET | `/authentication/magic-link` | Nao | Autenticacao via magic link |
| refresh-token | POST | `/authentication/refresh-token` | Sim | Renovacao de tokens JWT |
| request-code | POST | `/authentication/recovery/request-code` | Nao | Solicitar codigo de recuperacao |
| validate-code | POST | `/authentication/recovery/validate-code` | Nao | Validar codigo de recuperacao |
| reset-password | PUT | `/authentication/recovery/update-password` | Sim | Atualizar senha |

## Operacoes

- [sign-in](./sign-in/CLAUDE.md)
- [sign-up](./sign-up/CLAUDE.md)
- [sign-out](./sign-out/CLAUDE.md)
- [magic-link](./magic-link/CLAUDE.md)
- [refresh-token](./refresh-token/CLAUDE.md)
- [request-code](./request-code/CLAUDE.md)
- [validate-code](./validate-code/CLAUDE.md)
- [reset-password](./reset-password/CLAUDE.md)
