# setup/paging — Paginação (etapa 6)

Define o número padrão de itens por página nas listagens da plataforma, gravado
no documento Setting. Etapa "fina" de formulário único.

## Arquivos

| Arquivo          | Tipo       | Descrição                                           |
| ---------------- | ---------- | --------------------------------------------------- |
| `index.tsx`      | Route      | `head` com título "Setup - Paginação"               |
| `index.lazy.tsx` | Componente | Select de itens por página + `useSetupSubmitPaging` |

## Campos

| Estado    | Setting               | Default | Descrição                                |
| --------- | --------------------- | ------- | ---------------------------------------- |
| `perPage` | `PAGINATION_PER_PAGE` | `'20'`  | Itens por página: 10 / 20 / 30 / 40 / 50 |

O valor do Select é string e vai ao backend convertido com `Number(perPage)`.

## Navegação

`useSetupSubmitPaging` faz `POST /setup/paging`. No sucesso segue o padrão do
wizard (`completed → '/'`, senão `→ /setup/${data.currentStep}`, normalmente
`email`). Estado todo local via `useState`.
