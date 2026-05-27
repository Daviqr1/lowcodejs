import { z } from 'zod';

export const ExtensionToggleParamsValidator = z
  .object({
    _id: z.string().min(1),
  })
  .strict();

export type ExtensionToggleParamsInput = z.infer<
  typeof ExtensionToggleParamsValidator
>;

export const ExtensionToggleBodyValidator = z
  .object({
    enabled: z.boolean(),
  })
  .strict();

export type ExtensionToggleBodyInput = z.infer<
  typeof ExtensionToggleBodyValidator
>;
