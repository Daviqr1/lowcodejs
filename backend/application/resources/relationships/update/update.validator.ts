import z from 'zod';

import { Merge } from '@application/core/entity.core';

import {
  RelationshipEndpointValidator,
  RelationshipIdParamsValidator,
  RelationshipOnDeleteValidator,
} from '../relationship-base.validator';

export const RelationshipUpdateParamsValidator = RelationshipIdParamsValidator;

export const RelationshipUpdateBodyValidator = z
  .object({
    name: z.string().trim().min(1).optional(),
    source: RelationshipEndpointValidator.optional(),
    target: RelationshipEndpointValidator.optional(),
    onDelete: RelationshipOnDeleteValidator.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export type RelationshipUpdatePayload = Merge<
  z.infer<typeof RelationshipUpdateParamsValidator>,
  z.infer<typeof RelationshipUpdateBodyValidator>
>;
