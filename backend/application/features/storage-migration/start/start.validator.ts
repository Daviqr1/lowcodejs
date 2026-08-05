import { z } from 'zod';

import { Env } from '@start/env';

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
