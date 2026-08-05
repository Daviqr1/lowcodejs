import z from 'zod';

import { SlugIdParamsValidator } from '@application/core/validator.core';

export const TableRowDeleteParamsValidator = SlugIdParamsValidator;

export type TableRowDeletePayload = z.infer<
  typeof TableRowDeleteParamsValidator
>;
