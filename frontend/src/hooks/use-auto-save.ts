import React from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'draft' | 'error';

type UseAutoSaveOptions = {
  onSave: () => Promise<void>;
  isDraft: boolean;
  canSave?: () => boolean;
  debounceMs?: number;
  intervalMs?: number;
  isDirty?: () => boolean;
};

type UseAutoSaveReturn = {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  triggerSave: () => void;
  cancelPending: () => void;
};

// Debounce curto: triggerSave e chamado no blur do campo, nao por tecla.
// So coalesce blur+refocus imediato (ex: tab entre campos).
const DEFAULT_DEBOUNCE_MS = 300;
// Fallback periodico de salvamento.
const DEFAULT_INTERVAL_MS = 30_000;

export function useAutoSave({
  onSave,
  isDraft,
  canSave,
  isDirty,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  intervalMs = DEFAULT_INTERVAL_MS,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [status, setStatus] = React.useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);

  const isSavingRef = React.useRef(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = React.useRef(onSave);
  const canSaveRef = React.useRef(canSave);
  const isDirtyRef = React.useRef(isDirty);
  const isDraftRef = React.useRef(isDraft);

  React.useEffect((): void => {
    onSaveRef.current = onSave;
    canSaveRef.current = canSave;
    isDirtyRef.current = isDirty;
    isDraftRef.current = isDraft;
  }, [onSave, canSave, isDirty, isDraft]);

  const performSave = React.useCallback(async (): Promise<void> => {
    if (isSavingRef.current) return;
    if (canSaveRef.current && !canSaveRef.current()) return;

    isSavingRef.current = true;
    setStatus('saving');

    try {
      await onSaveRef.current();
      const now = new Date();
      setLastSavedAt(now);
      if (isDraftRef.current) {
        setStatus('draft');
      } else {
        setStatus('saved');
      }
    } catch {
      setStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  const cancelPending = React.useCallback((): void => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const triggerSave = React.useCallback((): void => {
    if (canSaveRef.current && !canSaveRef.current()) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout((): void => {
      debounceRef.current = null;
      void performSave();
    }, debounceMs);
  }, [debounceMs, performSave]);

  React.useEffect((): (() => void) => {
    const interval = setInterval((): void => {
      if (isSavingRef.current) return;
      if (debounceRef.current) return;
      if (isDirtyRef.current && !isDirtyRef.current()) return;
      if (canSaveRef.current && !canSaveRef.current()) return;
      void performSave();
    }, intervalMs);
    return (): void => clearInterval(interval);
  }, [intervalMs, performSave]);

  React.useEffect((): (() => void) => {
    return (): void => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  React.useEffect((): void => {
    if (status === 'saved' && isDraft) {
      setStatus('draft');
    }
    if (status === 'draft' && !isDraft) {
      setStatus('saved');
    }
  }, [isDraft, status]);

  return { status, lastSavedAt, triggerSave, cancelPending };
}
