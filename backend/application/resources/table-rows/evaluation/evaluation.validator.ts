import z from 'zod';

import { Merge } from '@application/core/entity.core';
import { SlugIdParamsValidator } from '@application/core/validator.core';

export const TableRowEvaluationBodyValidator = z.object({
  value: z.number(),
  field: z.string().trim(),
});

export const TableRowEvaluationParamsValidator = SlugIdParamsValidator;

export type TableRowEvaluationPayload = Merge<
  Merge<
    z.infer<typeof TableRowEvaluationParamsValidator>,
    z.infer<typeof TableRowEvaluationBodyValidator>
  >,
  {
    user: string;
  }
>;
