import z from 'zod';

import { NAME_MAX_LENGTH } from '@application/core/field-rules.core';

export const TableFieldSuggestSlugBodyValidator = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
});

export const TableFieldSuggestSlugParamsValidator = z.object({
  slug: z.string().trim(),
});

export type TableFieldSuggestSlugPayload = {
  tableSlug: string;
  name: string;
};
