import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

export const TABLE_IMPORT_NAMESPACE = '/table-import';

export const TABLE_IMPORT_EVENT = {
  PROGRESS: 'progress',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type TableImportPhase = 'structure' | 'rows' | 'relationships' | 'menus';

export type TableImportProgress = {
  job_id: string;
  phase: TableImportPhase;
  processed: number;
  total: number;
  current_table: string | null;
  failed: number;
};

export type TableImportCompleted = {
  job_id: string;
  importedFields: number;
  importedRows: number;
  importedMenus: number;
  tables: Array<{ slug: string; name: string }>;
};

export type TableImportError = {
  job_id: string;
  message: string;
};

export type TableImportSocketState = {
  isConnected: boolean;
  progress: TableImportProgress | null;
  completed: TableImportCompleted | null;
  error: TableImportError | null;
};

const INITIAL_STATE: TableImportSocketState = {
  isConnected: false,
  progress: null,
  completed: null,
  error: null,
};

/**
 * Conecta ao namespace `/table-import` e acompanha o progresso da importação
 * correlacionada pelo `jobId`. Eventos de outros jobs são ignorados. Passe
 * `jobId = null` para desconectar/resetar (ex.: modal fechado).
 */
export function useTableImportSocket(
  baseUrl: string,
  jobId: string | null,
): TableImportSocketState {
  const [state, setState] = useState<TableImportSocketState>(INITIAL_STATE);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!jobId) {
      setState(INITIAL_STATE);
      return;
    }

    setState(INITIAL_STATE);

    const socket = io(`${baseUrl}${TABLE_IMPORT_NAMESPACE}`, {
      withCredentials: true,
      path: '/socket.io',
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setState((prev) => ({ ...prev, isConnected: true }));
    });

    socket.on('disconnect', () => {
      setState((prev) => ({ ...prev, isConnected: false }));
    });

    socket.on(TABLE_IMPORT_EVENT.PROGRESS, (evt: TableImportProgress) => {
      if (evt.job_id !== jobId) return;
      setState((prev) => ({ ...prev, progress: evt }));
    });

    socket.on(TABLE_IMPORT_EVENT.COMPLETED, (evt: TableImportCompleted) => {
      if (evt.job_id !== jobId) return;
      setState((prev) => ({ ...prev, completed: evt }));
    });

    socket.on(TABLE_IMPORT_EVENT.ERROR, (evt: TableImportError) => {
      if (evt.job_id !== jobId) return;
      setState((prev) => ({ ...prev, error: evt }));
    });

    return (): void => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [baseUrl, jobId]);

  return state;
}
