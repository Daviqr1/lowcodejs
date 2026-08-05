import z from 'zod';

import { identifier } from '@application/features/_shared.validator';

/** Entrada da fatia `storage`. Fonte unica dos `*.schema.ts`. */

export const StorageDeleteParamsValidator = identifier();

export type StorageDeletePayload = z.infer<typeof StorageDeleteParamsValidator>;

export const StorageUploadQueryValidator = z.object({
  staticName: z.string().min(1, 'O ID é obrigatório').trim().optional(),
});

export type StorageUploadQuery = z.infer<typeof StorageUploadQueryValidator>;
