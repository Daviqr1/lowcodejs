import z from 'zod';

export const SetupNameBodyValidator = z.object({
  SYSTEM_NAME: z
    .string({ message: 'O nome do sistema é obrigatório' })
    .trim()
    .min(1, 'O nome do sistema deve ter ao menos 1 caractere')
    .max(100, 'O nome do sistema deve ter no máximo 100 caracteres'),
  LOCALE: z.enum(['pt-br', 'en-us'], {
    message: 'O locale deve ser pt-br ou en-us',
  }),
});

export type SetupNamePayload = z.infer<typeof SetupNameBodyValidator>;
