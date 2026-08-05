import z from 'zod';

import { BulkIdsValidator } from '@application/core/validator.core';

export const MenuBulkRestoreBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type MenuBulkRestorePayload = z.infer<
  typeof MenuBulkRestoreBodyValidator
>;
