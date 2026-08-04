import type { Namespace, Server as SocketIOServer } from 'socket.io';

import type { TStorageLocation } from '@application/core/entity.core';
import type { JwtDecoder } from '@application/services/socket-auth/socket-auth-contract.service';

export const STORAGE_MIGRATION_NAMESPACE = '/storage-migration';

export const STORAGE_MIGRATION_EVENT = {
  PROGRESS: 'progress',
  FILE_MIGRATED: 'file_migrated',
  FILE_FAILED: 'file_failed',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type StorageMigrationProgressEvent = {
  job_id: string;
  processed: number;
  total: number;
  current_filename: string | null;
  failed_count: number;
  eta_seconds: number | null;
};

export type StorageMigrationFileMigratedEvent = {
  _id: string;
  filename: string;
  from: TStorageLocation;
  to: TStorageLocation;
};

export type StorageMigrationFileFailedEvent = {
  _id: string;
  filename: string;
  error: string;
  attempts: number;
};

export type StorageMigrationCompletedEvent = {
  job_id: string;
  total: number;
  succeeded: number;
  failed: number;
  duration_ms: number;
};

export type StorageMigrationErrorEvent = {
  job_id: string;
  message: string;
};

/**
 * Namespace `/storage-migration`: progresso em tempo real da migracao de
 * arquivos entre drivers. Restrito a MASTER — a checagem vai pelo fecho de
 * grupos, nao pelo `role` do JWT.
 */
export abstract class StorageMigrationSocketContractService {
  abstract init(io: SocketIOServer, decode: JwtDecoder): Namespace;
  abstract namespace(): Namespace | null;
}
