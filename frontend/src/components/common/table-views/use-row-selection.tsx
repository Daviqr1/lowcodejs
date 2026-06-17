import React from 'react';

import { Checkbox } from '@/components/ui/checkbox';

export interface RowSelectionContextValue {
  selectedIds: Array<string>;
  count: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectMany: (ids: Array<string>) => void;
  deselectMany: (ids: Array<string>) => void;
  clear: () => void;
}

const RowSelectionContext =
  React.createContext<RowSelectionContextValue | null>(null);

interface RowSelectionProviderProps {
  /**
   * Quando muda, a selecao e zerada. Use para limpar ao trocar de tabela,
   * pagina, modo de visualizacao ou lixeira.
   */
  resetKey?: string;
  children: React.ReactNode;
}

export function RowSelectionProvider({
  resetKey,
  children,
}: RowSelectionProviderProps): React.JSX.Element {
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    setSelected(new Set());
  }, [resetKey]);

  const value = React.useMemo<RowSelectionContextValue>(() => {
    const selectedIds = Array.from(selected);

    return {
      selectedIds,
      count: selectedIds.length,
      isSelected: (id: string): boolean => selected.has(id),
      toggle: (id: string): void =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      selectMany: (ids: Array<string>): void =>
        setSelected((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.add(id));
          return next;
        }),
      deselectMany: (ids: Array<string>): void =>
        setSelected((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        }),
      clear: (): void => setSelected(new Set()),
    };
  }, [selected]);

  return (
    <RowSelectionContext.Provider value={value}>
      {children}
    </RowSelectionContext.Provider>
  );
}

/**
 * Retorna o contexto de selecao ou null quando usado fora do provider
 * (ex.: views que nao suportam selecao em lote).
 */
export function useRowSelection(): RowSelectionContextValue | null {
  return React.useContext(RowSelectionContext);
}

/**
 * Checkbox de selecao de uma linha/card. Assina o contexto e re-renderiza
 * sozinho, sem precisar reconstruir colunas/cards a cada toggle.
 */
export function RowSelectCheckbox({
  id,
  label,
  className,
}: {
  id: string;
  label?: string;
  className?: string;
}): React.JSX.Element | null {
  const selection = useRowSelection();
  if (!selection) return null;

  return (
    <Checkbox
      checked={selection.isSelected(id)}
      onCheckedChange={() => selection.toggle(id)}
      aria-label={label ?? 'Selecionar registro'}
      className={className}
    />
  );
}

/**
 * Checkbox "selecionar todos" para um conjunto de ids (geralmente a pagina
 * atual). Estado indeterminado quando apenas parte esta selecionada.
 */
export function RowSelectAllCheckbox({
  ids,
  label,
}: {
  ids: Array<string>;
  label?: string;
}): React.JSX.Element | null {
  const selection = useRowSelection();
  if (!selection) return null;

  const allSelected =
    ids.length > 0 && ids.every((id) => selection.isSelected(id));
  const someSelected = ids.some((id) => selection.isSelected(id));
  const checked = allSelected ? true : someSelected ? 'indeterminate' : false;

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(value) => {
        if (value) selection.selectMany(ids);
        else selection.deselectMany(ids);
      }}
      aria-label={label ?? 'Selecionar todos'}
    />
  );
}
