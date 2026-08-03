import z from 'zod';

export const ValidateCodeBodyValidator = z.object({
  code: z
    .string({ message: 'O código é obrigatório' })
    .min(1, 'O código é obrigatório')
    .trim(),
  // Escopa o codigo ao solicitante: sem isto qualquer codigo vivo no sistema
  // autentica qualquer conta.
  email: z
    .string({ message: 'O e-mail é obrigatório' })
    .min(1, 'O e-mail é obrigatório')
    .trim(),
});

export type ValidateCodePayload = z.infer<typeof ValidateCodeBodyValidator>;
