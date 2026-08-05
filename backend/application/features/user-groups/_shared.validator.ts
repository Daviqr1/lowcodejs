import z from 'zod';

import {
  E_ROLE,
  type IUser,
  type Merge,
  type ValueOf,
} from '@application/core/entity.core';
import {
  bulkIds,
  pagination,
  boolFlag,
} from '@application/features/_shared.validator';

/**
 * Entrada da fatia `user-groups`. Fonte unica — os `*.schema.ts` derivam daqui
 * o JSON Schema da rota com `zodToRouteSchema`.
 */

/** `:_id` das rotas por grupo. Antes copiado em 5 operacoes. */
export const UserGroupIdentifierParamsValidator = z.object({
  _id: z
    .string({ message: 'O ID é obrigatório' })
    .trim()
    .min(1, 'O ID é obrigatório'),
});

const UserGroupDescriptionValidator = z
  .string({ message: 'A descrição deve ser um texto' })
  .trim()
  .nullable();

const UserGroupPermissionsValidator = z.array(
  z.string({ message: 'Cada permissão deve ser um texto' }),
);

const UserGroupEncompassesValidator = z
  .array(z.string({ message: 'Cada grupo deve ser um texto' }))
  .optional();

/** Busca e ordenacao comuns a listar e exportar. */
const UserGroupFilterQueryValidator = z.object({
  search: z.string({ message: 'A busca deve ser um texto' }).trim().optional(),
  trashed: boolFlag(),
  'order-name': z.enum(['asc', 'desc']).optional(),
  'order-description': z.enum(['asc', 'desc']).optional(),
  'order-created-at': z.enum(['asc', 'desc']).optional(),
});

/** Quem pediu a consulta, injetado pelo controller a partir da sessao. */
type RequesterScope = {
  user?: Merge<Pick<IUser, '_id'>, { role: ValueOf<typeof E_ROLE> }>;
};

// ── Create e update ───────────────────────────────────────────────────

export const UserGroupCreateBodyValidator = z.object({
  name: z
    .string({ message: 'O nome é obrigatório' })
    .trim()
    .min(1, 'O nome é obrigatório'),
  description: UserGroupDescriptionValidator,
  permissions: UserGroupPermissionsValidator.min(
    1,
    'Pelo menos uma permissão é obrigatória',
  ),
  encompasses: UserGroupEncompassesValidator,
});

export type UserGroupCreatePayload = z.infer<
  typeof UserGroupCreateBodyValidator
>;

export const UserGroupUpdateBodyValidator = z.object({
  name: z
    .string({ message: 'O nome deve ser um texto' })
    .trim()
    .min(1, 'O nome é obrigatório')
    .optional(),
  description: UserGroupDescriptionValidator.optional(),
  permissions: UserGroupPermissionsValidator.optional(),
  encompasses: UserGroupEncompassesValidator,
});

export type UserGroupUpdatePayload = Merge<
  z.infer<typeof UserGroupIdentifierParamsValidator>,
  z.infer<typeof UserGroupUpdateBodyValidator>
>;

// ── Leitura ───────────────────────────────────────────────────────────

export const UserGroupPaginatedQueryValidator =
  UserGroupFilterQueryValidator.extend(pagination().shape);

export type UserGroupPaginatedPayload = Merge<
  z.infer<typeof UserGroupPaginatedQueryValidator>,
  RequesterScope
>;

export const UserGroupExportCsvQueryValidator = UserGroupFilterQueryValidator;

export type UserGroupExportCsvPayload = Merge<
  z.infer<typeof UserGroupExportCsvQueryValidator>,
  RequesterScope
>;

export type UserGroupShowPayload = z.infer<
  typeof UserGroupIdentifierParamsValidator
>;

// ── Lixeira e exclusao ────────────────────────────────────────────────

export type UserGroupSendToTrashPayload = z.infer<
  typeof UserGroupIdentifierParamsValidator
>;

export type UserGroupRemoveFromTrashPayload = z.infer<
  typeof UserGroupIdentifierParamsValidator
>;

export type UserGroupDeletePayload = z.infer<
  typeof UserGroupIdentifierParamsValidator
>;

// ── Operacoes em massa ────────────────────────────────────────────────

/** `ids` das tres operacoes em massa. */
export const UserGroupBulkIdsBodyValidator = z.object({
  ids: bulkIds(),
});

export type UserGroupBulkTrashPayload = z.infer<
  typeof UserGroupBulkIdsBodyValidator
>;
export type UserGroupBulkRestorePayload = z.infer<
  typeof UserGroupBulkIdsBodyValidator
>;
export type UserGroupBulkDeletePayload = z.infer<
  typeof UserGroupBulkIdsBodyValidator
>;
