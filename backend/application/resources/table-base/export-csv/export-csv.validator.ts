import z from 'zod';

export const TableExportCsvQueryValidator = z.object({
  search: z.string().trim().optional(),
  name: z.string().trim().optional(),
  trashed: z.string().trim().optional(),
  owner: z.string().trim().optional(),

  'order-name': z.enum(['asc', 'desc']).optional(),
  'order-link': z.enum(['asc', 'desc']).optional(),
  'order-created-at': z.enum(['asc', 'desc']).optional(),
  'order-owner': z.enum(['asc', 'desc']).optional(),
});

export type TableExportCsvPayload = z.infer<
  typeof TableExportCsvQueryValidator
>;
