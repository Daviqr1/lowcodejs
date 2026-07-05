import { Service } from 'fastify-decorators';

import type { TStorageLocation } from '@application/core/entity.core';

export const STORAGE_MIGRATION_QUEUE_NAME = 'storage-migration';

export const STORAGE_MIGRATION_JOB = {
  MIGRATE: 'migrate',
  CLEANUP: 'cleanup',
} as const;

export type StorageMigrationJobName =
  (typeof STORAGE_MIGRATION_JOB)[keyof typeof STORAGE_MIGRATION_JOB];

export type MigrateJobPayload = {
  source_driver: TStorageLocation;
  target_driver: TStorageLocation;
  file_ids: string[];
  concurrency: number;
};

export type CleanupJobPayload = {
  driver_to_clear: TStorageLocation;
  file_ids: string[];
};

export type ActiveJobInfo = {
  id: string;
  name: StorageMigrationJobName;
  state: 'waiting' | 'active' | 'delayed' | 'completed' | 'failed' | 'unknown';
  progress: number;
};

@Service()
export abstract class StorageMigrationQueueContractService {
  abstract enqueueMigration(payload: MigrateJobPayload): Promise<string>;
  abstract enqueueCleanup(payload: CleanupJobPayload): Promise<string>;
  abstract getActiveJob(): Promise<ActiveJobInfo | null>;
  abstract close(): Promise<void>;
}
