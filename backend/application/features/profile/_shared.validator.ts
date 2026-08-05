import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import {
  email,
  identifier,
  strongPassword,
} from '@application/features/_shared.validator';

/** Entrada da fatia `profile`. Fonte unica dos `*.schema.ts`. */

export const ProfileUpdateBodyValidator = z.object({
  name: z
    .string({ message: 'O nome é obrigatório' })
    .min(1, 'O nome é obrigatório')
    .trim(),
  email: email(),
  currentPassword: z
    .string({ message: 'A senha atual deve ser um texto' })
    .trim()
    .optional(),
  newPassword: strongPassword('A nova senha').optional(),
  allowPasswordChange: z.coerce.boolean().default(false),
  notificationsEnabled: z.coerce.boolean().optional(),
});

/** O id vem da sessao (`request.user.sub`), nunca da rota. */
export const ProfileIdentifierValidator = identifier();

export type ProfileUpdatePayload = Merge<
  z.infer<typeof ProfileIdentifierValidator>,
  z.infer<typeof ProfileUpdateBodyValidator>
>;

export type ProfileShowPayload = z.infer<typeof ProfileIdentifierValidator>;
