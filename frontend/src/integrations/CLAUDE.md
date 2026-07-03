# integrations — Configurações de Integração de Frameworks

Setup e configuração das integrações com TanStack Form e TanStack Query.

## Subdiretórios

| Diretório         | Responsabilidade                                                      |
| ----------------- | --------------------------------------------------------------------- |
| `tanstack-form/`  | `createFormHook` com 45 field components, contexts, hook de validação |
| `tanstack-query/` | `QueryClientProvider`, devtools panel                                 |

## tanstack-form/

- `form-hook.ts`: exporta `useAppForm` e `withForm` — usados em **todos** os
  formulários da aplicação
- `form-context.ts`: contexts tipados (`fieldContext`, `formContext`) para
  acesso ao estado do form em componentes filhos
- `use-field-validation.ts`: hook que combina `field.state.meta.isTouched` +
  `field.state.meta.errors` em uma interface consistente
- `use-api-error-auto-clear.ts`: limpa os erros de servidor (slot `onServer`) do
  form quando o usuário edita qualquer campo
- `fields/`: 45 componentes de campo em 4 categorias (base, rich, table-config,
  table-row) — registrados todos no `createFormHook`

## tanstack-query/

- `root-provider.tsx`: `<Provider>` que envolve a aplicação com
  `QueryClientProvider` usando a instância de `@/lib/query-client`
- `devtools.tsx`: painel de devtools do TanStack Query (só em desenvolvimento)
