# tables/$slug/$rowSlug — Registro por slug

Rota de acesso direto a um registro pelo seu slug compartilhável
(`sharedRowSlug`), em vez do `_id`. `$slug` = tabela, `$rowSlug` = registro.

| Arquivo     | Papel                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `index.tsx` | Route config: resolve o registro pelo slug (via `show-by-slug`) e redireciona/renderiza a visualização do registro |

Backend correspondente: `features/table-rows/show-by-slug`.
