import { z } from 'zod';

export const StorageMigrationStatusValidator = z.object({}).strict();

export type StorageMigrationStatusInput = z.infer<
  typeof StorageMigrationStatusValidator
>;
