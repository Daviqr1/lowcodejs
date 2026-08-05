import z from 'zod';

import { BulkIdsValidator } from '@application/core/validator.core';

export const MenuBulkDeleteBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type MenuBulkDeletePayload = z.infer<typeof MenuBulkDeleteBodyValidator>;
