import z from 'zod';

import { Merge } from '@application/core/entity.core';

import {
  RelationshipEndpointValidator,
  RelationshipOnDeleteValidator,
  RelationshipSlugParamsValidator,
} from '../relationship-base.validator';

export const RelationshipCreateBodyValidator = z.object({
  name: z.string().trim().min(1).optional(),
  source: RelationshipEndpointValidator,
  target: RelationshipEndpointValidator,
  onDelete: RelationshipOnDeleteValidator,
});

export const RelationshipCreateParamsValidator =
  RelationshipSlugParamsValidator;

export type RelationshipCreatePayload = Merge<
  z.infer<typeof RelationshipCreateParamsValidator>,
  z.infer<typeof RelationshipCreateBodyValidator>
>;
