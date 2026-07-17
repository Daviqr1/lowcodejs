import z from 'zod';

import { Merge } from '@application/core/entity.core';

export const TableRowAutoSaveParamsValidator = z.object({
  slug: z.string().trim(),
  // _id: z.string().trim(),
});

export const TableRowAutoSaveQueryValidator = z.object({
  _id: z.string().trim().optional(),
});

export const TableRowAutoSaveBodyValidator = z.record(
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
    z

      .object({
        // _id: z.string().trim().optional(),
        creator: z.string().trim(),
      })
      .loose(),
  ]),
);

export type TableRowAutoSavePayload = Merge<
  z.infer<typeof TableRowAutoSaveParamsValidator>,
  z.infer<typeof TableRowAutoSaveBodyValidator>
>;
