# Senhas (extensão `apps/modules/senhas`)

Cofre de senhas inspirado no [passbolt](https://www.passbolt.com/), modelado a
partir do **Forum** (canais + mensagens). Duas diferenças centrais:

1. **Segredos criptografados em repouso** — os campos sensíveis das entradas
   (`secret` e `notes`) são gravados apenas como ciphertext AES-256-GCM. Dump do
   Mongo = ilegível sem a chave. (Não é E2E: o servidor decifra em runtime para
   exibir a um membro autorizado.)
2. **Canais privados por padrão** — todo canal nasce com `private: true`.

Como o devsuite gerencia projetos de software, faz sentido gerenciar senhas
junto (ex.: `passbolt.cett.org.br`).

## Modelo (Forum → Senhas)

| Forum                         | Senhas                                |
| ----------------------------- | ------------------------------------- |
| Canal (row da tabela)         | `PasswordChannel` (`password_channels`) |
| Mensagem (group `mensagens`)  | `PasswordEntry` (`password_entries`)  |
| `texto` (rich text)           | `secret` + `notes` (**cifrados**)     |
| privacidade (público/privado) | `private` (**privado por padrão**)    |
| membros do canal              | `members` (controle de acesso)        |

Diferente do Forum (que usa rows de tabela dinâmica), este módulo persiste em
**models Mongoose dedicados** no DB de sistema — permite cifrar campos no schema
e isola os segredos dos dados low-code.

## Acesso UI

`/e/apps/senhas` (URL canônica). Qualquer usuário **autenticado** pode usar
(sem restrição de role no manifest) — o controle fino é por canal.

## Endpoints (`/e/apps/senhas`)

| Método | Rota                                    | Descrição                                  |
| ------ | --------------------------------------- | ------------------------------------------ |
| GET    | `/channels`                             | Lista canais visíveis (owner/membro/público) |
| POST   | `/channels`                             | Cria canal (privado por padrão)            |
| PUT    | `/channels/:channelId`                  | Atualiza canal (**apenas owner**)          |
| DELETE | `/channels/:channelId`                  | Exclui canal + todas as entradas (owner)   |
| GET    | `/channels/:channelId/entries`          | Lista senhas **decifradas** do canal       |
| POST   | `/channels/:channelId/entries`          | Cria senha (cifra `secret`/`notes`)        |
| PUT    | `/channels/:channelId/entries/:entryId` | Atualiza senha                             |
| DELETE | `/channels/:channelId/entries/:entryId` | Exclui senha                               |

Todos blindados por `AuthenticationMiddleware({ optional: false })` +
`ExtensionActiveMiddleware({ pkg: 'apps', type: MODULE, extensionId: 'senhas' })`.

## Regras de acesso

| Papel    | Definição                            | Pode                                       |
| -------- | ------------------------------------ | ------------------------------------------ |
| owner    | criador do canal                     | tudo, incl. renomear/excluir/gerir membros |
| member   | owner OU presente em `members`       | ler e editar entradas (CRUD de senhas)     |
| público  | qualquer autenticado, se `!private`  | **somente leitura** das entradas           |

Escrita de entradas exige `member` mesmo em canal público.

## Criptografia

`senhas.crypto.ts` — AES-256-GCM. Chave derivada por SHA-256 de
`PASSWORDS_ENCRYPTION_KEY` (env) ou, na ausência, do `COOKIE_SECRET`.

- Formato persistido: `enc:v1:<ivB64>:<authTagB64>:<cipherB64>`.
- `encryptSecret` / `decryptSecret` toleram `null` e valores legados em claro.
- **Trocar a chave torna os segredos existentes ilegíveis** — em produção,
  defina `PASSWORDS_ENCRYPTION_KEY` (estável) no `.env`.
- Apenas `secret` e `notes` são cifrados; `title`/`username`/`url` ficam em
  claro como metadados (busca/listagem) — igual ao modelo do passbolt.

## Arquivos

| Arquivo                     | Papel                                                  |
| --------------------------- | ------------------------------------------------------ |
| `manifest.json`             | MODULE, route `/e/apps/senhas`                         |
| `senhas.crypto.ts`          | AES-256-GCM encrypt/decrypt                            |
| `senhas.model.ts`           | Models `PasswordChannel` + `PasswordEntry`            |
| `senhas.types.ts`           | Interfaces e DTOs                                      |
| `senhas.validator.ts`       | Zod (canal + entrada)                                 |
| `senhas.schema.ts`          | Schemas Fastify/OpenAPI por rota                      |
| `senhas-channel.use-case.ts`| CRUD de canais + helpers `isMember`/`canView`         |
| `senhas-entry.use-case.ts`  | CRUD de entradas (cifra na escrita, decifra na leitura)|
| `senhas.controller.ts`      | 8 rotas REST                                          |

## Erros possíveis

| Code | Cause                          | Quando                                   |
| ---- | ------------------------------ | ---------------------------------------- |
| 403  | SENHAS_CHANNEL_OWNER_REQUIRED  | Não-owner tentando gerir o canal         |
| 403  | SENHAS_CHANNEL_MEMBER_REQUIRED | Não-membro tentando escrever entradas    |
| 403  | SENHAS_CHANNEL_ACCESS_DENIED   | Sem acesso de leitura ao canal privado   |
| 404  | SENHAS_CHANNEL_NOT_FOUND       | Canal inexistente                        |
| 404  | SENHAS_ENTRY_NOT_FOUND         | Entrada inexistente                      |
| 404  | EXTENSION_NOT_ACTIVE           | Extensão desativada                      |
| 500  | SENHAS_*_ERROR                 | Erro interno (log no servidor)           |

## Ativação

Pacote `apps` começa **desativado**. Reinicie o backend (loader registra no DB)
e ative em `/extensions` (MASTER). Defina `PASSWORDS_ENCRYPTION_KEY` no `.env`
antes de cadastrar segredos em produção.
