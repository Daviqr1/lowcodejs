import z from 'zod';

import { SlugIdParamsValidator } from '@application/core/validator.core';

export const TableFieldSendToTrashParamsValidator = SlugIdParamsValidator;

export type TableFieldSendToTrashPayload = z.infer<
  typeof TableFieldSendToTrashParamsValidator
>;
