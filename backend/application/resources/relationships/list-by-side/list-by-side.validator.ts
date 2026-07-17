import z from 'zod';

import { Merge } from '@application/core/entity.core';

import { RelationshipIdParamsValidator } from '../relationship-base.validator';

export const RelationshipListBySideParamsValidator =
  RelationshipIdParamsValidator;

export const RelationshipListBySideQueryValidator = z.object({
  side: z.enum(['source', 'target']),
  recordId: z.string().trim().min(1),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
});

export type RelationshipListBySidePayload = Merge<
  z.infer<typeof RelationshipListBySideParamsValidator>,
  z.infer<typeof RelationshipListBySideQueryValidator>
>;
