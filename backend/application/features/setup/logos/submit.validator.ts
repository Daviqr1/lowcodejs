import z from 'zod';

export const SetupLogosBodyValidator = z.object({
  LOGO_SMALL_URL: z
    .string({ message: 'A URL do logo pequeno deve ser um texto' })
    .trim()
    .nullable(),
  LOGO_LARGE_URL: z
    .string({ message: 'A URL do logo grande deve ser um texto' })
    .trim()
    .nullable(),
});

export type SetupLogosPayload = z.infer<typeof SetupLogosBodyValidator>;
