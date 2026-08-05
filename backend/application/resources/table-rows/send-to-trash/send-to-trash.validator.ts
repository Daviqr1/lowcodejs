import z from 'zod';

import { SlugIdParamsValidator } from '@application/core/validator.core';

export const TableRowSendToTrashParamsValidator = SlugIdParamsValidator;

export type TableRowSendToTrashPayload = z.infer<
  typeof TableRowSendToTrashParamsValidator
>;
