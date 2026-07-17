import z from 'zod';

import { RelationshipIdParamsValidator } from '../relationship-base.validator';

export const RelationshipDeleteParamsValidator = RelationshipIdParamsValidator;

export type RelationshipDeletePayload = z.infer<
  typeof RelationshipDeleteParamsValidator
>;
