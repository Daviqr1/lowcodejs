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

function userGroupDescription(): z.ZodNullable<z.ZodString> {
  return z
    .string({ message: 'A descrição deve ser um texto' })
    .trim()
    .nullable();
}

function userGroupPermissions(): z.ZodArray<z.ZodString> {
  return z.array(z.string({ message: 'Cada permissão deve ser um texto' }));
}

function userGroupEncompasses(): z.ZodOptional<z.ZodArray<z.ZodString>> {
  return z
    .array(z.string({ message: 'Cada grupo deve ser um texto' }))
    .optional();
}

/** Busca e ordenacao comuns a listar e exportar. */
function userGroupFilterQuery(): z.ZodObject<
  {
    search: z.ZodOptional<z.ZodString>;
    trashed: z.ZodOptional<
      z.ZodPreprocess<
        z.ZodPipe<
          z.ZodEnum<{
            true: 'true';
            false: 'false';
          }>,
          z.ZodTransform<boolean, 'true' | 'false'>
        >
      >
    >;
    'order-name': z.ZodOptional<
      z.ZodEnum<{
        readonly ASC: 'asc';
        readonly DESC: 'desc';
      }>
    >;
    'order-description': z.ZodOptional<
      z.ZodEnum<{
        readonly ASC: 'asc';
        readonly DESC: 'desc';
      }>
    >;
    'order-created-at': z.ZodOptional<
      z.ZodEnum<{
        readonly ASC: 'asc';
        readonly DESC: 'desc';
      }>
    >;
  },
  z.core.$strip
> {
  return z.object({
    search: search(),
    trashed: boolFlag(),
    'order-name': sortDirection(),
    'order-description': sortDirection(),
    'order-created-at': sortDirection(),
  });
}

// ── Create e update ───────────────────────────────────────────────────

export const UserGroupCreateBodyValidator = z.object({
  name: z
    .string({ message: 'O nome é obrigatório' })
    .trim()
    .min(1, 'O nome é obrigatório'),
  description: userGroupDescription(),
  permissions: userGroupPermissions().min(
    1,
    'Pelo menos uma permissão é obrigatória',
  ),
  encompasses: userGroupEncompasses(),
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
  description: userGroupDescription().optional(),
  permissions: userGroupPermissions().optional(),
  encompasses: userGroupEncompasses(),
});

export type UserGroupUpdatePayload = Merge<
  z.infer<typeof UserGroupIdentifierParamsValidator>,
  z.infer<typeof UserGroupUpdateBodyValidator>
>;

// ── Leitura ───────────────────────────────────────────────────────────

export const UserGroupPaginatedQueryValidator = userGroupFilterQuery().extend(
  pagination().shape,
);

export type UserGroupPaginatedPayload = Merge<
  z.infer<typeof UserGroupPaginatedQueryValidator>,
  RequesterScope
>;

export const UserGroupExportCsvQueryValidator = userGroupFilterQuery();

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
