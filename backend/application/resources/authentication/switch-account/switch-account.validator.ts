import z from 'zod';

export const SwitchAccountBodyValidator = z.object({
  accountId: z.string().trim().min(1, 'A conta é obrigatória'),
});
