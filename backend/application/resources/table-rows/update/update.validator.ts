import z from 'zod';

import { Merge } from '@application/core/entity.core';
import { SlugIdParamsValidator } from '@application/core/validator.core';

export const TableRowUpdateBodyValidator = z.record(
  z.string(),
  z.union([
    z.string().trim(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.string().trim()),
    z.array(z.number()),
    z.array(
      z
        .object({
          _id: z.string().trim().optional(),
        })
        .loose(),
    ),
    z.object({}).loose(),
  ]),
);

export const TableRowUpdateParamsValidator = SlugIdParamsValidator;

export type TableRowUpdatePayload = Merge<
  z.infer<typeof TableRowUpdateParamsValidator>,
  z.infer<typeof TableRowUpdateBodyValidator>
>;
