import z from 'zod';

import { SlugIdParamsValidator } from '@application/core/validator.core';

export const TableFieldShowParamsValidator = SlugIdParamsValidator;

export type TableFieldShowPayload = z.infer<
  typeof TableFieldShowParamsValidator
>;
