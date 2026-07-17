import z from 'zod';

import { Merge } from '@application/core/entity.core';

import { RelationshipIdParamsValidator } from '../relationship-base.validator';

export const RelationshipReorderParamsValidator = RelationshipIdParamsValidator;

export const RelationshipReorderBodyValidator = z.object({
  items: z
    .array(
      z.object({
        linkId: z.string().trim().min(1),
        order: z.number().int().min(0),
      }),
    )
    .min(1),
});

export type RelationshipReorderPayload = Merge<
  z.infer<typeof RelationshipReorderParamsValidator>,
  z.infer<typeof RelationshipReorderBodyValidator>
>;
