import z from 'zod';

export const StorageUploadQueryValidator = z.object({
  staticName: z.string().min(1, 'O ID é obrigatório').trim().optional(),
});

export type StorageUploadQuery = z.infer<typeof StorageUploadQueryValidator>;
