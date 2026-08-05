import z from 'zod';

import {
  E_RELATIONSHIP_ON_DELETE,
  type Merge,
} from '@application/core/entity.core';
import { pagination, perPage } from '@application/features/_shared.validator';

/**
 * Entrada da fatia `relationships`. Fonte unica — os `*.schema.ts` derivam
 * daqui o JSON Schema da rota com `zodToRouteSchema`.
 *
 * Os validators por operacao eram, na maioria, apelidos de um bloco desta
 * fatia (`RelationshipIdParamsValidator` aparecia sob 5 nomes diferentes).
 */

/** Um lado do relacionamento: tabela + campo RELATIONSHIP + controles. */
const RelationshipEndpointValidator = z.object({
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

const RelationshipOnDeleteValidator = z.enum(E_RELATIONSHIP_ON_DELETE);

/** `:slug` da tabela — as rotas da fatia penduram em `/tables/:slug`. */
export const RelationshipSlugParamsValidator = z.object({
  slug: z.string().trim().min(1),
});

/** `:slug` + `:id` da definicao de relacionamento. */
export const RelationshipIdParamsValidator = z.object({
  slug: z.string().trim().min(1),
  id: z.string().trim().min(1),
});

// ── Create e update ───────────────────────────────────────────────────

export const RelationshipCreateBodyValidator = z.object({
  name: z.string().trim().min(1).optional(),
  source: RelationshipEndpointValidator,
  target: RelationshipEndpointValidator,
  onDelete: RelationshipOnDeleteValidator,
});

export type RelationshipCreatePayload = Merge<
  z.infer<typeof RelationshipSlugParamsValidator>,
  z.infer<typeof RelationshipCreateBodyValidator>
>;

export const RelationshipUpdateBodyValidator = z
  .object({
    name: z.string().trim().min(1).optional(),
    source: RelationshipEndpointValidator.optional(),
    target: RelationshipEndpointValidator.optional(),
    onDelete: RelationshipOnDeleteValidator.optional(),
  })
  // Regra cruzada: `.refine()` nao vai para o JSON Schema.
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export type RelationshipUpdatePayload = Merge<
  z.infer<typeof RelationshipIdParamsValidator>,
  z.infer<typeof RelationshipUpdateBodyValidator>
>;

export type RelationshipDeletePayload = z.infer<
  typeof RelationshipIdParamsValidator
>;

// ── Links ─────────────────────────────────────────────────────────────

export const RelationshipLinkBodyValidator = z.object({
  // Lado a partir do qual a acao parte: o `:slug` da rota e esta tabela.
  side: z.enum(['source', 'target']),
  // Registro fixo deste lado.
  recordId: z.string().trim().min(1),
  // Registro do outro lado a vincular.
  otherId: z.string().trim().min(1),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

export type RelationshipLinkRequestPayload = Merge<
  z.infer<typeof RelationshipIdParamsValidator>,
  z.infer<typeof RelationshipLinkBodyValidator>
>;

export const RelationshipUnlinkParamsValidator =
  RelationshipIdParamsValidator.extend({
    linkId: z.string().trim().min(1),
  });

export type RelationshipUnlinkPayload = z.infer<
  typeof RelationshipUnlinkParamsValidator
>;

export const RelationshipListBySideQueryValidator = z.object({
  side: z.enum(['source', 'target']),
  recordId: z.string().trim().min(1),
  ...pagination().shape,
  perPage: perPage().default(10),
});

export type RelationshipListBySidePayload = Merge<
  z.infer<typeof RelationshipIdParamsValidator>,
  z.infer<typeof RelationshipListBySideQueryValidator>
>;

export const RelationshipReorderBodyValidator = z.object({
  items: z
    .array(
      z.object({
        linkId: z.string().trim().min(1),
        order: z.number().int().min(0),
      }),
    )
    .min(1),
});

export type RelationshipReorderPayload = Merge<
  z.infer<typeof RelationshipIdParamsValidator>,
  z.infer<typeof RelationshipReorderBodyValidator>
>;
