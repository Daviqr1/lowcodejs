# Bulk Action Bar

Barra de ações em lote que aparece quando o usuário seleciona linhas em uma
tabela. Renderiza ações condicionais conforme o contexto (lista ativa vs
lixeira) e o role do usuário (apenas MASTER vê "Excluir permanentemente").

## Props

```ts
type BulkActionBarProps = {
  selectedCount: number;
  isTrashView: boolean;
  canDelete: boolean; // true apenas para MASTER
  onClear: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  isTrashing?: boolean;
  isRestoring?: boolean;
  extraActions?: React.ReactNode; // ações extras na lista ativa
};
```

## Comportamento

- Lista ativa (`isTrashView=false`): exibe `extraActions` (se houver) + "Enviar
  para lixeira".
- Lista lixeira (`isTrashView=true`): exibe "Restaurar" e, se `canDelete`,
  "Excluir permanentemente".
- Botão "X" sempre disponível para limpar seleção.
- `extraActions` é um slot livre para ações específicas de cada tela. Ex.: a tela
  de Usuários injeta um dropdown "Alterar status" (Ativar/Desativar) que chama
  `useUserBulkUpdate`.

## Padrão

- Posição: `sticky bottom-4` dentro do container da tabela.
- Sem ternários — render condicional via `{cond && <X/>}`.
