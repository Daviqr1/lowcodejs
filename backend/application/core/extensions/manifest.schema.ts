import { z } from 'zod';

import { E_EXTENSION_TYPE, E_ROLE } from '@application/core/entity.core';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-_]*$/;

export const ManifestRequiresSchema = z
  .object({
    lowcodejs: z.string().optional(),
    extensions: z.array(z.string()).optional(),
  })
  .strict()
  .optional();

/**
 * Placement para PLUGIN.
 *
 * Pode ser:
 * - `{ slots: string[] }` — plugin de UI injetado em placeholders do core
 * - `{ kind: 'row-access-guard' }` — plugin que intercepta comportamento do core
 *
 * Plugins com `kind` não aparecem em slots de UI mas registram um contrato
 * de guard no RowAccessGuardService.
 */
export const ManifestPlacementSchema = z
  .union([
    z.object({ slots: z.array(z.string().min(1)).min(1) }).strict(),
    z.object({ kind: z.literal('row-access-guard') }).strict(),
  ])
  .optional();

export const ManifestPermissionsSchema = z
  .object({
    view: z.array(z.enum(E_ROLE)).optional().default([]),
  })
  .strict()
  .optional();

export const ManifestToolSchema = z
  .object({
    submenu: z.string().optional(),
  })
  .strict()
  .optional();

export const ManifestSchema = z
  .object({
    id: z.string().regex(SLUG_REGEX),
    type: z.enum(E_EXTENSION_TYPE),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    version: z.string().min(1),
    author: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    placement: ManifestPlacementSchema,
    route: z.string().nullable().optional(),
    configRoute: z.string().nullable().optional(),
    tool: ManifestToolSchema,
    requires: ManifestRequiresSchema,
    permissions: ManifestPermissionsSchema,
  })
  .passthrough();

export type ManifestInput = z.infer<typeof ManifestSchema>;
