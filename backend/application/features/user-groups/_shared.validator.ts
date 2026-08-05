import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import {
  boolFlag,
  bulkIds,
  identifier,
  pagination,
  type RequesterScope,
  search,
  sortDirection,
} from '@application/features/_shared.validator';

/**
 * Entrada da fatia `user-groups`. Fonte unica — os `*.schema.ts` derivam daqui
 * o JSON Schema da rota com `zodToRouteSchema`.
 */

/** `:_id` das rotas por grupo. Antes copiado em 5 operacoes. */
export const UserGroupIdentifierParamsValidator = identifier();

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
  search: search(),
  trashed: boolFlag(),
  'order-name': sortDirection(),
  'order-description': sortDirection(),
  'order-created-at': sortDirection(),
});

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
