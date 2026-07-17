import { z } from 'zod';

export const TableRowShowBySlugParamsValidator = z.object({
  slug: z.string().trim(),
  rowSlug: z.string().trim(),
});

export type TableRowShowBySlugPayload = z.infer<
  typeof TableRowShowBySlugParamsValidator
>;
