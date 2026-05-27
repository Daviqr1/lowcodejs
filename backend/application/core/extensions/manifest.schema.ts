import { z } from 'zod';

import { E_EXTENSION_TYPE } from '@application/core/entity.core';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-_]*$/;

export const ManifestRequiresSchema = z
  .object({
    lowcodejs: z.string().optional(),
    extensions: z.array(z.string()).optional(),
  })
  .strict()
  .optional();

export const ManifestPlacementSchema = z
  .object({
    slot: z.string().min(1).optional(),
    kind: z.enum(['row-access-guard']).optional(),
  })
  .strict()
  .refine((p) => p.slot || p.kind, {
    message: 'placement deve ter slot ou kind',
  })
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
    tool: ManifestToolSchema,
    requires: ManifestRequiresSchema,
  })
  .passthrough();

export type ManifestInput = z.infer<typeof ManifestSchema>;
