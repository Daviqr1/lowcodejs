import z from 'zod';

export const UserGroupCreateBodyValidator = z.object({
  name: z
    .string({ message: 'O nome é obrigatório' })
    .trim()
    .min(1, 'O nome é obrigatório'),
  description: z
    .string({ message: 'A descrição deve ser um texto' })
    .trim()
    .nullable(),
  permissions: z
    .array(z.string({ message: 'Cada permissão deve ser um texto' }))
    .min(1, 'Pelo menos uma permissão é obrigatória'),
  encompasses: z
    .array(z.string({ message: 'Cada grupo deve ser um texto' }))
    .optional(),
});

export type UserGroupCreatePayload = z.infer<
  typeof UserGroupCreateBodyValidator
>;
