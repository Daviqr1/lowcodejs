import z from 'zod';

export const StorageDeleteParamsValidator = z.object({
  _id: z
    .string({ message: 'O ID é obrigatório' })
    .min(1, 'O ID é obrigatório')
    .trim(),
});

export type StorageDeletePayload = z.infer<typeof StorageDeleteParamsValidator>;
