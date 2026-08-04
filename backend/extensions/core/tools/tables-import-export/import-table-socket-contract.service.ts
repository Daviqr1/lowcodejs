import type { Namespace, Server as SocketIOServer } from 'socket.io';

import type { JwtDecoder } from '@application/services/socket-auth/socket-auth-contract.service';

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

export type TableImportEvent =
  (typeof TABLE_IMPORT_EVENT)[keyof typeof TABLE_IMPORT_EVENT];

export type TableImportEventPayload =
  | TableImportProgressEvent
  | TableImportCompletedEvent
  | TableImportErrorEvent;

/**
 * Namespace `/table-import`: progresso do import de tabelas. Cada socket
 * autenticado entra na room `user:<sub>`.
 *
 * Primeiro par contract + impl dentro de `extensions/` — o root ja era varrido
 * pelo `di-registry.ts`, mas nao tinha nenhum registro.
 */
export abstract class ImportTableSocketContractService {
  abstract init(io: SocketIOServer, decode: JwtDecoder): Namespace;
  abstract namespace(): Namespace | null;

  /** No-op quando o namespace ainda nao subiu ou nao ha `userId`. */
  abstract emit(
    userId: string | undefined,
    event: TableImportEvent,
    payload: TableImportEventPayload,
  ): void;
}
