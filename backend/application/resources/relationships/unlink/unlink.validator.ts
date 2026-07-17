import z from 'zod';

export const RelationshipUnlinkParamsValidator = z.object({
  slug: z.string().trim().min(1),
  id: z.string().trim().min(1),
  linkId: z.string().trim().min(1),
});

export type RelationshipUnlinkPayload = z.infer<
  typeof RelationshipUnlinkParamsValidator
>;
