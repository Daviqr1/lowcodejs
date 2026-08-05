import z from 'zod';

import { SlugIdParamsValidator } from '@application/core/validator.core';

export const TableFieldRemoveFromTrashParamsValidator = SlugIdParamsValidator;

export type TableFieldRemoveFromTrashPayload = z.infer<
  typeof TableFieldRemoveFromTrashParamsValidator
>;
