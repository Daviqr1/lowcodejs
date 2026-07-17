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
    /**
     * Mapa de tableId -> settings a persistir em lote.
     * As settings são validadas individualmente pelo guard antes de persistir.
     */
    tableSettings: z.record(
      z.string().min(1),
      z.record(z.string(), z.unknown()),
    ),
  })
  .strict();

export type BulkConfigureTableSettingsBodyInput = z.infer<
  typeof BulkConfigureTableSettingsBodyValidator
>;
