import z from 'zod';

import { E_REACTION_TYPE, Merge } from '@application/core/entity.core';
import { SlugIdParamsValidator } from '@application/core/validator.core';

export const TableRowReactionBodyValidator = z.object({
  type: z.enum([E_REACTION_TYPE.LIKE, E_REACTION_TYPE.UNLIKE]),
  field: z.string().trim(),
});

export const TableRowReactionParamsValidator = SlugIdParamsValidator;

export type TableRowReactionPayload = Merge<
  Merge<
    z.infer<typeof TableRowReactionParamsValidator>,
    z.infer<typeof TableRowReactionBodyValidator>
  >,
  {
    user: string;
  }
>;
