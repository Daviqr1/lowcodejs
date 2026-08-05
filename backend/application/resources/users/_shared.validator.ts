import z from 'zod';

import {
  E_ROLE,
  E_USER_STATUS,
  type IUser,
  type Merge,
  type ValueOf,
} from '@application/core/entity.core';
import { PASSWORD_REGEX } from '@application/core/field-rules.core';
import {
  bulkIds,
  pagination,
  boolFlag,
} from '@application/resources/_shared.validator';

/**
 * Entrada da fatia `users`: os schemas Zod e os tipos derivados deles.
 *
 * Esta e a fonte unica — os `*.schema.ts` derivam o JSON Schema daqui com
 * `zodToRouteSchema`, entao a regra nao existe escrita duas vezes.
 *
 * Sao valores de escopo de modulo, avaliados no import antes de o container de
 * DI existir: o escape documentado em `application/core/CLAUDE.md`.
 */

// ── Blocos reusados ───────────────────────────────────────────────────

/** `:_id` das rotas por usuario. Repetido em 5 operacoes. */
export const UserIdentifierParamsValidator = z.object({
  _id: z
    .string({ message: 'O ID é obrigatório' })
    .trim()
    .min(1, 'O ID é obrigatório'),
});

const UserBaseValidator = z.object({
  name: z
    .string({ message: 'O nome é obrigatório' })
    .trim()
    .min(1, 'O nome é obrigatório'),
  email: z
    .string({ message: 'O email é obrigatório' })
    .email('Digite um email válido')
    .trim(),
  group: z
    .string({ message: 'O grupo é obrigatório' })
    .min(1, 'O grupo é obrigatório'),
  groups: z
    .array(z.string({ message: 'Cada grupo deve ser um texto' }))
    .optional(),
});

const UserStatusValidator = z.enum(
  [E_USER_STATUS.ACTIVE, E_USER_STATUS.INACTIVE],
  { message: 'O status deve ser ACTIVE ou INACTIVE' },
);

const UserPasswordValidator = z
  .string({ message: 'A senha é obrigatória' })
  .trim()
  .min(6, 'A senha deve ter no mínimo 6 caracteres')
  .regex(
    PASSWORD_REGEX,
    'A senha deve conter: 1 maiúscula, 1 minúscula, 1 número e 1 especial',
  );

/** Busca, filtros e ordenacao comuns a listar e exportar. */
const UserFilterQueryValidator = z.object({
  search: z.string({ message: 'A busca deve ser um texto' }).trim().optional(),

  trashed: boolFlag(),

  status: z.enum(E_USER_STATUS, { message: 'Status inválido' }).optional(),

  // Contexto da consulta. Declarar `role=ADMINISTRATOR` pede ao backend
  // aplicar as regras de escopo do admin (hoje: esconder MASTER).
  // O JWT confirma autorizacao — ver `user.repository.ts`.
  role: z.enum(E_ROLE, { message: 'Role inválido' }).optional(),

  'order-name': z.enum(['asc', 'desc']).optional(),
  'order-email': z.enum(['asc', 'desc']).optional(),
  'order-group': z.enum(['asc', 'desc']).optional(),
  'order-status': z.enum(['asc', 'desc']).optional(),
  'order-created-at': z.enum(['asc', 'desc']).optional(),
});

/** Quem pediu a consulta, injetado pelo controller a partir da sessao. */
type RequesterScope = {
  user?: Merge<Pick<IUser, '_id'>, { role: ValueOf<typeof E_ROLE> }>;
};

/** Quem executou a acao, injetado pelo controller a partir da sessao. */
type ActorScope = { actorId: string };

// ── Create ────────────────────────────────────────────────────────────

export const UserCreateBodyValidator = UserBaseValidator.extend({
  password: UserPasswordValidator,
});

export type UserCreatePayload = z.infer<typeof UserCreateBodyValidator>;

// ── Update ────────────────────────────────────────────────────────────

export const UserUpdateBodyValidator = UserBaseValidator.partial().extend({
  password: UserPasswordValidator.optional(),
  status: UserStatusValidator.optional(),
});

export type UserUpdatePayload = Merge<
  z.infer<typeof UserIdentifierParamsValidator>,
  z.infer<typeof UserUpdateBodyValidator>
>;

// ── Leitura ───────────────────────────────────────────────────────────

export const UserPaginatedQueryValidator = UserFilterQueryValidator.extend(
  pagination().shape,
);

export type UserPaginatedPayload = Merge<
  z.infer<typeof UserPaginatedQueryValidator>,
  RequesterScope
>;

export const UserExportCsvQueryValidator = UserFilterQueryValidator;

export type UserExportCsvPayload = Merge<
  z.infer<typeof UserExportCsvQueryValidator>,
  RequesterScope
>;

export type UserShowPayload = z.infer<typeof UserIdentifierParamsValidator>;

// ── Lixeira e exclusao ────────────────────────────────────────────────

export type UserSendToTrashPayload = Merge<
  z.infer<typeof UserIdentifierParamsValidator>,
  ActorScope
>;

export type UserRemoveFromTrashPayload = z.infer<
  typeof UserIdentifierParamsValidator
>;

export type UserDeletePayload = Merge<
  z.infer<typeof UserIdentifierParamsValidator>,
  ActorScope
>;

// ── Operacoes em massa ────────────────────────────────────────────────

/** `ids` das tres operacoes em massa sem outro campo. */
export const UserBulkIdsBodyValidator = z.object({ ids: bulkIds() });

export type UserBulkTrashPayload = Merge<
  z.infer<typeof UserBulkIdsBodyValidator>,
  ActorScope
>;

export type UserBulkRestorePayload = z.infer<typeof UserBulkIdsBodyValidator>;

export type UserBulkDeletePayload = Merge<
  z.infer<typeof UserBulkIdsBodyValidator>,
  ActorScope
>;

export const UserBulkUpdateBodyValidator = z.object({
  ids: bulkIds().max(500),
  status: UserStatusValidator,
});

export type UserBulkUpdatePayload = Merge<
  z.infer<typeof UserBulkUpdateBodyValidator>,
  ActorScope
>;
