import z from 'zod';

import { Merge } from '@application/core/entity.core';

export const TableRowExportCsvQueryValidator = z
  .object({
    search: z.string().trim().optional(),
  })
  .loose();

export const TableRowExportCsvParamsValidator = z.object({
  slug: z.string().trim(),
});

export type TableRowExportCsvPayload = Merge<
  Merge<
    z.infer<typeof TableRowExportCsvParamsValidator>,
    z.infer<typeof TableRowExportCsvQueryValidator>
  >,
  { user?: string }
>;
