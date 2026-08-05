import z from 'zod';

export const PageShowParamsValidator = z.object({
  slug: z
    .string({ message: 'O slug é obrigatório' })
    .min(1, 'O slug é obrigatório')
    .trim(),
});

export type PageShowPayload = z.infer<typeof PageShowParamsValidator>;
