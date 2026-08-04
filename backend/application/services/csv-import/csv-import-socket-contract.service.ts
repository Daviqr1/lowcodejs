import type { Namespace, Server as SocketIOServer } from 'socket.io';

import type { JwtDecoder } from '@application/services/socket-auth/socket-auth-contract.service';

export const CSV_IMPORT_NAMESPACE = '/csv-import';

export const CSV_IMPORT_EVENT = {
  PROGRESS: 'progress',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type CsvImportProgressEvent = {
  job_id: string;
  processed: number;
  total: number;
};

export type CsvImportCompletedEvent = {
  job_id: string;
  imported: number;
  skipped: number;
  total: number;
};

export type CsvImportErrorEvent = {
  job_id: string;
  message: string;
  cause: string;
};

export type StoredFinalEvent =
  | { kind: 'completed'; event: CsvImportCompletedEvent }
  | { kind: 'error'; event: CsvImportErrorEvent };

export type CsvImportSocketInit = {
  namespace: Namespace;
  storeResult: (jobId: string, result: StoredFinalEvent) => void;
};

/**
 * Namespace `/csv-import`: progresso do import de CSV. Restrito a
 * MASTER/ADMINISTRATOR pelo fecho de grupos. Guarda o evento final por job para
 * reentregar a quem conectar depois de o import terminar.
 */
export abstract class CsvImportSocketContractService {
  abstract init(io: SocketIOServer, decode: JwtDecoder): Namespace;
  abstract namespace(): Namespace | null;

  /** Memoriza o evento final do job (TTL curto) para entrega tardia. */
  abstract storeResult(jobId: string, result: StoredFinalEvent): void;
}
