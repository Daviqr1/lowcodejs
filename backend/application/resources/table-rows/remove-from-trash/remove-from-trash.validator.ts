import z from 'zod';

import { SlugIdParamsValidator } from '@application/core/validator.core';

export const TableRowRemoveFromTrashParamsValidator = SlugIdParamsValidator;

export type TableRowRemoveFromTrashPayload = z.infer<
  typeof TableRowRemoveFromTrashParamsValidator
>;
