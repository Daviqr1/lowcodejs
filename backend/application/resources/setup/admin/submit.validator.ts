import z from 'zod';

import { PASSWORD_REGEX } from '@application/core/field-rules.core';

export const SetupAdminBodyValidator = z
  .object({
    name: z
      .string({ message: 'O nome é obrigatório' })
      .min(1, 'O nome é obrigatório')
      .trim(),
    email: z
      .string({ message: 'O email é obrigatório' })
      .email('Digite um email válido')
      .trim(),
    password: z
      .string({ message: 'A senha é obrigatória' })
      .min(6, 'A senha deve ter no mínimo 6 caracteres')
      .regex(
        PASSWORD_REGEX,
        'A senha deve conter ao menos: 1 maiúscula, 1 minúscula, 1 número e 1 especial',
      )
      .trim(),
    confirmPassword: z
      .string({ message: 'A confirmação de senha é obrigatória' })
      .min(1, 'A confirmação de senha é obrigatória')
      .trim(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });

export type SetupAdminPayload = z.infer<typeof SetupAdminBodyValidator>;
