import z from 'zod';

export const SignOutBodyValidator = z.object({
  all: z.boolean().optional(),
});
