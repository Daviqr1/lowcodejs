import { z } from 'zod';

const SLUG_REGEX = /^[a-z][a-z0-9_]*$/;

export const dateWindowSettingsSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('createdAt-sliding'),
    slidingDays: z.number().int().positive().max(3650),
  }),
  z.object({
    mode: z.literal('createdAt-fixed'),
    fixedFrom: z.string().datetime().nullable(),
    fixedTo: z.string().datetime().nullable(),
  }),
  z.object({
    mode: z.literal('field-range'),
    validFromSlug: z.string().regex(SLUG_REGEX),
    validUntilSlug: z.string().regex(SLUG_REGEX),
  }),
]);

export type DateWindowSettings = z.infer<typeof dateWindowSettingsSchema>;
