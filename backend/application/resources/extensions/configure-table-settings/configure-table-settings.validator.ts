import { z } from 'zod';

export const ConfigureTableSettingsParamsValidator = z
  .object({
    _id: z.string().min(1),
    tableId: z.string().min(1),
  })
  .strict();

export type ConfigureTableSettingsParamsInput = z.infer<
  typeof ConfigureTableSettingsParamsValidator
>;

export const ConfigureTableSettingsBodyValidator = z
  .object({
    settings: z.record(z.string(), z.unknown()),
    /** ISO 8601 datetime string — convertido para Date no controller */
    expectedUpdatedAt: z.string().min(1),
  })
  .strict();

export type ConfigureTableSettingsBodyInput = z.infer<
  typeof ConfigureTableSettingsBodyValidator
>;
