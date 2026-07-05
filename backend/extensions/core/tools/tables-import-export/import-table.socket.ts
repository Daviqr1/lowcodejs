/**
 * Socket.IO namespace `/table-import`.
 *
 * Feed de progresso em tempo real da importação de tabelas. O cliente gera um
 * `job_id` (UUID), abre o modal, conecta neste namespace e dispara o POST
 * `/tools/import-table` com o mesmo `job_id`. O `ImportTableUseCase` emite os
 * eventos abaixo na room `user:<sub>` do usuário que está importando — o
 * frontend filtra pelos eventos cujo `job_id` bate com o seu.
 *
 * Eventos (server → client):
 *   - progress   { job_id, phase, processed, total, current_table, failed }
 *   - completed  { job_id, importedFields, importedRows, importedMenus, tables }
 *   - error      { job_id, message }
 */

import type { Namespace, Server as SocketIOServer } from 'socket.io';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';

export const TABLE_IMPORT_NAMESPACE = '/table-import';

export const TABLE_IMPORT_EVENT = {
  PROGRESS: 'progress',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type TableImportPhase = 'structure' | 'rows' | 'relationships' | 'menus';

export type TableImportProgressEvent = {
  job_id: string;
  phase: TableImportPhase;
  processed: number;
  total: number;
  current_table: string | null;
  failed: number;
};

export type TableImportCompletedEvent = {
  job_id: string;
  importedFields: number;
  importedRows: number;
  importedMenus: number;
  tables: Array<{ slug: string; name: string }>;
};

export type TableImportErrorEvent = {
  job_id: string;
  message: string;
};

let tableImportNamespace: Namespace | null = null;

export function getTableImportNamespace(): Namespace | null {
  return tableImportNamespace;
}

function extractCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  let lastValue: string | undefined;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      lastValue = rest.join('=');
    }
  }
  return lastValue;
}

export function initTableImportSocket(
  io: SocketIOServer,
  jwtDecode: (value: string) => IJWTPayload | null,
): Namespace {
  const namespace = io.of(TABLE_IMPORT_NAMESPACE);

  namespace.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie;
    const accessToken = extractCookieValue(cookieHeader, 'accessToken');

    if (!accessToken) {
      next(new Error('Autenticação necessária.'));
      return;
    }

    const decoded = jwtDecode(accessToken);
    if (!decoded || decoded.type !== E_JWT_TYPE.ACCESS) {
      next(new Error('Token inválido.'));
      return;
    }

    socket.data.user = decoded;
    next();
  });

  namespace.on('connection', (socket) => {
    const userId: string = socket.data.user?.sub ?? '';
    if (userId) socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      // Socket.IO remove o socket das rooms automaticamente.
    });
  });

  tableImportNamespace = namespace;
  return namespace;
}

/**
 * Emite um evento de import para a room do usuário. No-op quando o namespace
 * ainda não foi inicializado (ex.: testes unitários) ou quando não há `userId`.
 */
export function emitTableImportEvent(
  userId: string | undefined,
  event: (typeof TABLE_IMPORT_EVENT)[keyof typeof TABLE_IMPORT_EVENT],
  payload:
    | TableImportProgressEvent
    | TableImportCompletedEvent
    | TableImportErrorEvent,
): void {
  if (!tableImportNamespace || !userId) return;
  tableImportNamespace.to(`user:${userId}`).emit(event, payload);
}
