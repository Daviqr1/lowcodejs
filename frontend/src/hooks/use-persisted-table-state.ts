import type {
  ColumnOrderState,
  ColumnSizingState,
  VisibilityState,
} from '@tanstack/react-table';
import React from 'react';

interface PersistedTableState {
  columnVisibility?: VisibilityState;
  columnOrder?: ColumnOrderState;
  columnSizing?: ColumnSizingState;
}

const STORAGE_PREFIX = 'dt:';

function loadState(key: string): PersistedTableState {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return {};
    const parsed: PersistedTableState = JSON.parse(raw);
    return parsed;
  } catch {
    return {};
  }
}

function saveState(key: string, state: PersistedTableState): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}

interface UsePersistedTableStateOptions {
  persistKey?: string;
  initialColumnVisibility?: VisibilityState;
  initialColumnOrder?: ColumnOrderState;
  initialColumnSizing?: ColumnSizingState;
}

export function usePersistedTableState({
  persistKey,
  initialColumnVisibility = {},
  initialColumnOrder = [],
  initialColumnSizing = {},
}: UsePersistedTableStateOptions): {
  columnVisibility: VisibilityState;
  setColumnVisibility: React.Dispatch<React.SetStateAction<VisibilityState>>;
  columnOrder: ColumnOrderState;
  setColumnOrder: React.Dispatch<React.SetStateAction<ColumnOrderState>>;
  columnSizing: ColumnSizingState;
  setColumnSizing: React.Dispatch<React.SetStateAction<ColumnSizingState>>;
} {
  const enabled = !!persistKey;

  let initialPersisted: PersistedTableState = {};
  if (enabled) initialPersisted = loadState(persistKey);
  const persisted = React.useRef(initialPersisted);

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => {
      const base: VisibilityState = { ...initialColumnVisibility };
      if (enabled && persisted.current.columnVisibility) {
        return { ...base, ...persisted.current.columnVisibility };
      }
      return base;
    });

  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(() => {
    if (enabled && persisted.current.columnOrder?.length) {
      return persisted.current.columnOrder;
    }
    return initialColumnOrder;
  });

  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(
    () => {
      const base: ColumnSizingState = { ...initialColumnSizing };
      if (enabled && persisted.current.columnSizing) {
        return { ...base, ...persisted.current.columnSizing };
      }
      return base;
    },
  );

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!enabled) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveState(persistKey, { columnVisibility, columnOrder, columnSizing });
    }, 300);

    return (): void => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, persistKey, columnVisibility, columnOrder, columnSizing]);

  return {
    columnVisibility,
    setColumnVisibility,
    columnOrder,
    setColumnOrder,
    columnSizing,
    setColumnSizing,
  };
}
