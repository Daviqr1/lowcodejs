import { z } from 'zod';

export const BulkConfigureTableSettingsParamsValidator = z
  .object({
    _id: z.string().min(1),
  })
  .strict();

export type BulkConfigureTableSettingsParamsInput = z.infer<
  typeof BulkConfigureTableSettingsParamsValidator
>;

export const BulkConfigureTableSettingsBodyValidator = z
  .object({
    tableIds: z.array(z.string().min(1)).min(1).max(50),
    settings: z.record(z.string(), z.unknown()),
    /** ISO 8601 datetime string — convertido para Date no controller */
    expectedUpdatedAt: z.string().min(1),
  })
  .strict();

export type BulkConfigureTableSettingsBodyInput = z.infer<
  typeof BulkConfigureTableSettingsBodyValidator
>;
