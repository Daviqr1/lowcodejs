import z from 'zod';

import type { IUser, Merge } from '@application/core/entity.core';
import { email, strongPassword } from '@application/features/_shared.validator';

/**
 * Entrada da fatia `authentication`. Fonte unica — os `*.schema.ts` derivam
 * daqui o JSON Schema da rota com `zodToRouteSchema`.
 *
 * Email, senha e codigo estavam reescritos operacao a operacao, com mensagens
 * ligeiramente diferentes entre as copias.
 */

/** Codigo de uso unico do magic link e da recuperacao de senha. */
function code(): z.ZodString {
  return z
    .string({ message: 'O código é obrigatório' })
    .min(1, 'O código é obrigatório')
    .trim();
}

// ── Entrar e sair ─────────────────────────────────────────────────────

export const SignInBodyValidator = z.object({
  email: email(),
  // Aqui a senha so precisa existir: a forca e conferida contra o hash.
  password: z
    .string({ message: 'A senha é obrigatória' })
    .min(1, 'A senha é obrigatória')
    .trim(),
});

export type SignInPayload = z.infer<typeof SignInBodyValidator>;

export const SignUpBodyValidator = z.object({
  name: z
    .string({ message: 'O nome é obrigatório' })
    .min(1, 'O nome é obrigatório')
    .trim(),
  email: email(),
  password: strongPassword(),
});

export type SignUpPayload = z.infer<typeof SignUpBodyValidator>;

export const SignOutBodyValidator = z.object({
  all: z.boolean().optional(),
});

export const SwitchAccountBodyValidator = z.object({
  accountId: z.string().trim().min(1, 'A conta é obrigatória'),
});

// ── Recuperacao de senha e magic link ─────────────────────────────────

export const RequestCodeBodyValidator = z.object({ email: email() });

export type RequestCodePayload = z.infer<typeof RequestCodeBodyValidator>;

export const ValidateCodeBodyValidator = z.object({
  code: code(),
  // Escopa o codigo ao solicitante: sem isto qualquer codigo vivo no sistema
  // autentica qualquer conta.
  email: email(),
});

export type ValidateCodePayload = z.infer<typeof ValidateCodeBodyValidator>;

export const MagicLinkQueryValidator = z.object({ code: code() });

export type MagicLinkPayload = z.infer<typeof MagicLinkQueryValidator>;

export const ResetPasswordBodyValidator = z.object({
  password: strongPassword(),
});

export type ResetPasswordPayload = Merge<
  z.infer<typeof ResetPasswordBodyValidator>,
  Pick<IUser, '_id'>
>;

// ── Refresh ───────────────────────────────────────────────────────────

/** Sem Zod: o payload vem do proprio token, ja verificado pela sessao. */
export type RefreshTokenPayload = {
  _id: string;
  /** Geracao gravada no refresh token. Ausente nos tokens anteriores = 0. */
  sessionVersion?: number;
};
