# setup/name — Identidade do Sistema (etapa 2)

Define o nome e o idioma padrão da plataforma, gravados no documento Setting.
Segunda etapa do wizard, logo após a criação do usuário MASTER (`admin`).

## Arquivos

| Arquivo          | Tipo       | Descrição                                               |
| ---------------- | ---------- | ------------------------------------------------------- |
| `index.tsx`      | Route      | `head` com título "Setup - Identidade"                  |
| `index.lazy.tsx` | Componente | Input de nome + Select de idioma + `useSetupSubmitName` |

## Campos

| Estado       | Setting       | Default | Descrição                                        |
| ------------ | ------------- | ------- | ------------------------------------------------ |
| `systemName` | `SYSTEM_NAME` | `''`    | Nome exibido no título e cabeçalho (obrigatório) |
| `locale`     | `LOCALE`      | `pt-br` | Idioma padrão: `pt-br` ou `en-us`                |

## Navegação

`useSetupSubmitName` faz `POST /setup/name`. No sucesso segue o padrão do wizard
(`completed → '/'`, senão `→ /setup/${data.currentStep}`, normalmente
`storage`). Estado todo local via `useState`.
