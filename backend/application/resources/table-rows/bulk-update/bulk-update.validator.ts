import z from 'zod';

import { TableRowUpdateBodyValidator } from '../update/update.validator';

export const BulkUpdateParamsValidator = z.object({
  slug: z.string().trim(),
});

export const BulkUpdateBodyValidator = z.object({
  ids: z.array(z.string().trim()).min(1).max(200),
  data: TableRowUpdateBodyValidator.refine(
    (value) => Object.keys(value).length > 0,
    { message: 'Informe ao menos um campo para atualizar' },
  ),
});

export type BulkUpdatePayload = z.infer<typeof BulkUpdateParamsValidator> &
  z.infer<typeof BulkUpdateBodyValidator> & {
    __actorUserId?: string;
  };
