import z from 'zod';

import { SlugIdParamsValidator } from '@application/core/validator.core';

export const TableRowShowParamsValidator = SlugIdParamsValidator;

export type TableRowShowPayload = z.infer<typeof TableRowShowParamsValidator>;
