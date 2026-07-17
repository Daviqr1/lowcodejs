import z from 'zod';

import { E_RELATIONSHIP_ON_DELETE } from '@application/core/entity.core';

// Um lado do relacionamento: tabela + campo RELATIONSHIP + controles do endpoint.
export const RelationshipEndpointValidator = z.object({
  table: z.object({
    _id: z.string().trim().min(1),
    slug: z.string().trim().min(1),
  }),
  field: z.object({
    _id: z.string().trim().min(1),
    slug: z.string().trim().min(1),
  }),
  visible: z.boolean(),
  label: z.string().trim(),
});

export const RelationshipOnDeleteValidator = z.enum(E_RELATIONSHIP_ON_DELETE);

export const RelationshipSlugParamsValidator = z.object({
  slug: z.string().trim().min(1),
});

export const RelationshipIdParamsValidator = z.object({
  slug: z.string().trim().min(1),
  id: z.string().trim().min(1),
});
