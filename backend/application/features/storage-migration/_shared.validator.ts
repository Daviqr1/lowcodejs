import { z } from 'zod';

import { Env } from '@start/env';

/** Entrada da fatia `storage-migration`. Fonte unica dos `*.schema.ts`. */

export const StorageMigrationStatusValidator = z.object({}).strict();

export type StorageMigrationStatusInput = z.infer<
  typeof StorageMigrationStatusValidator
>;

export const StorageMigrationStartValidator = z
  .object({
    concurrency: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .default(Env.STORAGE_MIGRATION_CONCURRENCY),
    retry_failed_only: z.boolean().optional().default(false),
  })
  .strict();

export type StorageMigrationStartInput = z.infer<
  typeof StorageMigrationStartValidator
>;

export const StorageMigrationCleanupValidator = z
  .object({
    confirm: z.boolean(),
  })
  .strict();

export type StorageMigrationCleanupInput = z.infer<
  typeof StorageMigrationCleanupValidator
>;
