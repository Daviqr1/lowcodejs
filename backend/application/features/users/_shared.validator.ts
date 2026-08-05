import z from 'zod';

import {
  E_ROLE,
  E_USER_STATUS,
  type Merge,
} from '@application/core/entity.core';
import {
  type ActorScope,
  boolFlag,
  bulkIds,
  email,
  identifier,
  pagination,
  type RequesterScope,
  search,
  sortDirection,
  strongPassword,
} from '@application/features/_shared.validator';

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
export const UserIdentifierParamsValidator = identifier();

function userBase(): z.ZodObject<
  {
    name: z.ZodString;
    email: z.ZodString;
    group: z.ZodString;
    groups: z.ZodOptional<z.ZodArray<z.ZodString>>;
  },
  z.core.$strip
> {
  return z.object({
    name: z
      .string({ message: 'O nome é obrigatório' })
      .trim()
      .min(1, 'O nome é obrigatório'),
    email: email(),
    group: z
      .string({ message: 'O grupo é obrigatório' })
      .min(1, 'O grupo é obrigatório'),
    groups: z
      .array(z.string({ message: 'Cada grupo deve ser um texto' }))
      .optional(),
  });
}

function userStatus(): z.ZodEnum<{ ACTIVE: 'ACTIVE'; INACTIVE: 'INACTIVE' }> {
  return z.enum([E_USER_STATUS.ACTIVE, E_USER_STATUS.INACTIVE], {
    message: 'O status deve ser ACTIVE ou INACTIVE',
  });
}

/** Busca, filtros e ordenacao comuns a listar e exportar. */
function userFilterQuery(): z.ZodObject<
  {
    search: z.ZodOptional<z.ZodString>;
    trashed: ReturnType<typeof boolFlag>;
    status: z.ZodOptional<z.ZodEnum<typeof E_USER_STATUS>>;
    role: z.ZodOptional<z.ZodEnum<typeof E_ROLE>>;
    'order-name': ReturnType<typeof sortDirection>;
    'order-email': ReturnType<typeof sortDirection>;
    'order-group': ReturnType<typeof sortDirection>;
    'order-status': ReturnType<typeof sortDirection>;
    'order-created-at': ReturnType<typeof sortDirection>;
  },
  z.core.$strip
> {
  return z.object({
    search: search(),

    trashed: boolFlag(),

    status: z.enum(E_USER_STATUS, { message: 'Status inválido' }).optional(),

    // Contexto da consulta. Declarar `role=ADMINISTRATOR` pede ao backend
    // aplicar as regras de escopo do admin (hoje: esconder MASTER).
    // O JWT confirma autorizacao — ver `user.repository.ts`.
    role: z.enum(E_ROLE, { message: 'Role inválido' }).optional(),

    'order-name': sortDirection(),
    'order-email': sortDirection(),
    'order-group': sortDirection(),
    'order-status': sortDirection(),
    'order-created-at': sortDirection(),
  });
}

// ── Create ────────────────────────────────────────────────────────────

export const UserCreateBodyValidator = userBase().extend({
  password: strongPassword(),
});

export type UserCreatePayload = z.infer<typeof UserCreateBodyValidator>;

// ── Update ────────────────────────────────────────────────────────────

export const UserUpdateBodyValidator = userBase().partial().extend({
  password: strongPassword().optional(),
  status: userStatus().optional(),
});

export type UserUpdatePayload = Merge<
  z.infer<typeof UserIdentifierParamsValidator>,
  z.infer<typeof UserUpdateBodyValidator>
>;

// ── Leitura ───────────────────────────────────────────────────────────

export const UserPaginatedQueryValidator = userFilterQuery().extend(
  pagination().shape,
);

export type UserPaginatedPayload = Merge<
  z.infer<typeof UserPaginatedQueryValidator>,
  RequesterScope
>;

export const UserExportCsvQueryValidator = userFilterQuery();

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
  status: userStatus(),
});

export type UserBulkUpdatePayload = Merge<
  z.infer<typeof UserBulkUpdateBodyValidator>,
  ActorScope
>;
