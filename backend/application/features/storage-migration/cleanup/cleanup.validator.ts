import { z } from 'zod';

export const StorageMigrationCleanupValidator = z
  .object({
    confirm: z.boolean(),
  })
  .strict();

export type StorageMigrationCleanupInput = z.infer<
  typeof StorageMigrationCleanupValidator
>;
