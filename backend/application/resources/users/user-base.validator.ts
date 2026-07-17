import z from 'zod';

export const UserBaseValidator = z.object({
  name: z
    .string({ message: 'O nome é obrigatório' })
    .trim()
    .min(1, 'O nome é obrigatório'),
  email: z
    .string({ message: 'O email é obrigatório' })
    .email('Digite um email válido')
    .trim(),
  group: z
    .string({ message: 'O grupo é obrigatório' })
    .min(1, 'O grupo é obrigatório'),
  groups: z
    .array(z.string({ message: 'Cada grupo deve ser um texto' }))
    .optional(),
});

export type UserBasePayload = z.infer<typeof UserBaseValidator>;
