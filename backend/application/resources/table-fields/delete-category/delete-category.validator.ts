import z from 'zod';

import { SlugIdParamsValidator } from '@application/core/validator.core';

export const TableFieldDeleteCategoryParamsValidator =
  SlugIdParamsValidator.extend({
    categoryId: z.string().trim().min(1),
  });

export type TableFieldDeleteCategoryPayload = z.infer<
  typeof TableFieldDeleteCategoryParamsValidator
>;
