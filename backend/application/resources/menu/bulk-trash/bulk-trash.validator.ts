import z from 'zod';

import { BulkIdsValidator } from '@application/core/validator.core';

export const MenuBulkTrashBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type MenuBulkTrashPayload = z.infer<typeof MenuBulkTrashBodyValidator>;
