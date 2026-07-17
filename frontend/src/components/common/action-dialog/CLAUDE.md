# Action Dialog

Componente generico de dialogo de confirmacao para acoes destrutivas ou
reversivas. Encapsula o padrao de Dialog + useMutation + invalidacao de
queries + toast + navegacao opcional.

## Arquivos

| Arquivo             | Descricao                                                |
| ------------------- | -------------------------------------------------------- |
| `index.ts`          | Barrel export                                            |
| `action-dialog.tsx` | Componente ActionDialog com config de mutacao e feedback |

## Dependencias principais

- `@tanstack/react-query` (useMutation, QueryKey)
- `@tanstack/react-router` (useNavigate)
- `@/components/ui/dialog`
- `@/components/ui/button`
- `@/lib/handle-api-error`
- `@/lib/query-client`
- `sonner` (API `toast.*`)

## Padroes importantes

- Config object agrupa toda a customizacao por entidade (endpoint, query keys,
  textos, navegacao)
- Extende `ComponentProps<DialogTrigger>` para ser usado como wrapper de trigger
- Botao de cancelar usa classe `bg-destructive hover:bg-destructive`
- Navegacao pos-sucesso e opcional (restaurar nao navega, excluir sim)
- Suporta `data-test-id` customizaveis via `testId`, `confirmTestId`,
  `cancelTestId`
