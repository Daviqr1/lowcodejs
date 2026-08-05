import z from 'zod';

import { Merge } from '@application/core/entity.core';
import { SlugIdParamsValidator } from '@application/core/validator.core';

export const TableFieldDeleteParamsValidator = SlugIdParamsValidator;

export const TableFieldDeleteQueryValidator = z.object({
  group: z.string().trim().optional(),
});

export type TableFieldDeletePayload = Merge<
  z.infer<typeof TableFieldDeleteParamsValidator>,
  z.infer<typeof TableFieldDeleteQueryValidator>
>;
