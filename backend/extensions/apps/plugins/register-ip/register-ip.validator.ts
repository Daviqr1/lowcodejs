import { z } from 'zod';

export const RegisterIpParamsValidator = z.object({
  slug: z.string().trim().min(1),
  rowId: z.string().trim().min(1),
});

export type RegisterIpParams = z.infer<typeof RegisterIpParamsValidator>;
