import z from 'zod';

import type { IUser, Merge } from '@application/core/entity.core';
import { PASSWORD_REGEX } from '@application/core/field-rules.core';

/**
 * Entrada da fatia `authentication`. Fonte unica — os `*.schema.ts` derivam
 * daqui o JSON Schema da rota com `zodToRouteSchema`.
 *
 * Email, senha e codigo estavam reescritos operacao a operacao, com mensagens
 * ligeiramente diferentes entre as copias.
 */

const EmailValidator = z
  .string({ message: 'O email é obrigatório' })
  .email('Digite um email válido')
  .trim();

/** Senha nova: exige a forca do PASSWORD_REGEX. */
const StrongPasswordValidator = z
  .string({ message: 'A senha é obrigatória' })
  .min(6, 'A senha deve ter no mínimo 6 caracteres')
  .regex(
    PASSWORD_REGEX,
    'A senha deve conter ao menos: 1 maiúscula, 1 minúscula, 1 número e 1 especial',
  )
  .trim();

const CodeValidator = z
  .string({ message: 'O código é obrigatório' })
  .min(1, 'O código é obrigatório')
  .trim();

// ── Entrar e sair ─────────────────────────────────────────────────────

export const SignInBodyValidator = z.object({
  email: EmailValidator,
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
  email: EmailValidator,
  password: StrongPasswordValidator,
});

export type SignUpPayload = z.infer<typeof SignUpBodyValidator>;

export const SignOutBodyValidator = z.object({
  all: z.boolean().optional(),
});

export const SwitchAccountBodyValidator = z.object({
  accountId: z.string().trim().min(1, 'A conta é obrigatória'),
});

// ── Recuperacao de senha e magic link ─────────────────────────────────

export const RequestCodeBodyValidator = z.object({ email: EmailValidator });

export type RequestCodePayload = z.infer<typeof RequestCodeBodyValidator>;

export const ValidateCodeBodyValidator = z.object({
  code: CodeValidator,
  // Escopa o codigo ao solicitante: sem isto qualquer codigo vivo no sistema
  // autentica qualquer conta.
  email: z
    .string({ message: 'O e-mail é obrigatório' })
    .min(1, 'O e-mail é obrigatório')
    .trim(),
});

export type ValidateCodePayload = z.infer<typeof ValidateCodeBodyValidator>;

export const MagicLinkQueryValidator = z.object({ code: CodeValidator });

export type MagicLinkPayload = z.infer<typeof MagicLinkQueryValidator>;

export const ResetPasswordBodyValidator = z.object({
  password: StrongPasswordValidator,
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
