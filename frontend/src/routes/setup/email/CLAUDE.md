# setup/email — Configuração de Email (etapa 7, última)

Configura o servidor SMTP da plataforma, gravado no documento Setting. É o
**último** passo do wizard e é **opcional** — o SMTP pode ser configurado depois
em Configurações. Um botão "Pular" submete vazio e conclui o setup mesmo assim.

## Arquivos

| Arquivo          | Tipo       | Descrição                                                |
| ---------------- | ---------- | -------------------------------------------------------- |
| `index.tsx`      | Route      | `head` com título "Setup - Email"                        |
| `index.lazy.tsx` | Componente | Cinco campos SMTP + Pular/Salvar + `useSetupSubmitEmail` |

## Campos

| Estado     | Setting                   | Default | Descrição                       |
| ---------- | ------------------------- | ------- | ------------------------------- |
| `host`     | `EMAIL_PROVIDER_HOST`     | `''`    | Host SMTP                       |
| `port`     | `EMAIL_PROVIDER_PORT`     | `''`    | Porta (convertida com `Number`) |
| `user`     | `EMAIL_PROVIDER_USER`     | `''`    | Usuário SMTP                    |
| `password` | `EMAIL_PROVIDER_PASSWORD` | `''`    | Senha (toggle de visibilidade)  |
| `from`     | `EMAIL_PROVIDER_FROM`     | `''`    | Remetente (From)                |

Campos vazios viram `null` no payload; `port` vira `null` quando em branco,
senão `Number(port)`. "Pular" (`handleSkip`) chama `mutation.mutate({})`.

## Navegação

`useSetupSubmitEmail` faz `POST /setup/email`. Como é o último passo, o sucesso
normalmente traz `data.completed === true` → navega para `/`. Mantém o padrão do
wizard (`completed → '/'`, senão `→ /setup/${data.currentStep}`) por
consistência. Estado todo local via `useState`.
